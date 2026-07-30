import { create } from "zustand";
import type { QueryError, QueryResult } from "@/types/cosmos";
import type { TabSession, TabState } from "@/types/tabs";

const DEFAULT_QUERY = "SELECT * FROM c";

export function makeTabId(dbId: string, containerId: string): string {
  return `${dbId}__${containerId}`;
}

interface TabStore {
  tabs: TabState[];
  activeTabId: string | null;
  /** True once the persisted session has been loaded from the server. */
  hydrated: boolean;

  openTab: (dbId: string, containerId: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateQuery: (tabId: string, query: string) => void;
  setTabLoading: (tabId: string, isLoading: boolean) => void;
  setTabError: (tabId: string, error: QueryError) => void;
  /** Replace the in-memory tabs from a persisted session (results start empty). */
  hydrate: (session: TabSession) => void;
  /**
   * Apply a page of query results.
   * - `replace` (fresh run): results become this page; RU resets.
   * - `append` (load more): items appended, RU accumulated, token advanced.
   */
  applyQueryResult: (
    tabId: string,
    result: QueryResult,
    mode: "replace" | "append",
  ) => void;
}

function updateTab(
  tabs: TabState[],
  tabId: string,
  updater: (tab: TabState) => TabState,
): TabState[] {
  return tabs.map((tab) => (tab.id === tabId ? updater(tab) : tab));
}

export const useTabStore = create<TabStore>((set) => ({
  tabs: [],
  activeTabId: null,
  hydrated: false,

  openTab: (dbId, containerId) =>
    set((state) => {
      const id = makeTabId(dbId, containerId);
      if (state.tabs.some((tab) => tab.id === id)) {
        // Idempotent: activate the existing tab instead of duplicating it.
        return { activeTabId: id };
      }
      const tab: TabState = {
        id,
        databaseId: dbId,
        containerId,
        label: `${dbId} / ${containerId}`,
        query: DEFAULT_QUERY,
        results: null,
        error: null,
        isLoading: false,
      };
      return { tabs: [...state.tabs, tab], activeTabId: id };
    }),

  closeTab: (id) =>
    set((state) => {
      const index = state.tabs.findIndex((tab) => tab.id === id);
      if (index === -1) return state;

      const tabs = state.tabs.filter((tab) => tab.id !== id);
      let activeTabId = state.activeTabId;
      if (activeTabId === id) {
        const neighbor = tabs[index] ?? tabs[index - 1] ?? null;
        activeTabId = neighbor ? neighbor.id : null;
      }
      return { tabs, activeTabId };
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

  hydrate: (session) =>
    set(() => {
      const tabs: TabState[] = session.tabs.map((tab) => ({
        id: tab.id,
        databaseId: tab.databaseId,
        containerId: tab.containerId,
        label: tab.label,
        query: tab.query,
        results: null,
        error: null,
        isLoading: false,
      }));
      const activeTabId =
        session.activeTabId &&
        tabs.some((tab) => tab.id === session.activeTabId)
          ? session.activeTabId
          : (tabs[0]?.id ?? null);
      return { tabs, activeTabId, hydrated: true };
    }),

  updateQuery: (tabId, query) =>
    set((state) => ({
      tabs: updateTab(state.tabs, tabId, (tab) => ({ ...tab, query })),
    })),

  setTabLoading: (tabId, isLoading) =>
    set((state) => ({
      tabs: updateTab(state.tabs, tabId, (tab) => ({
        ...tab,
        isLoading,
        error: isLoading ? null : tab.error,
      })),
    })),

  setTabError: (tabId, error) =>
    set((state) => ({
      tabs: updateTab(state.tabs, tabId, (tab) => ({
        ...tab,
        error,
        isLoading: false,
      })),
    })),

  applyQueryResult: (tabId, result, mode) =>
    set((state) => ({
      tabs: updateTab(state.tabs, tabId, (tab) => {
        const previousItems =
          mode === "append" && tab.results ? tab.results.items : [];
        const previousCharge =
          mode === "append" && tab.results ? tab.results.requestCharge : 0;
        const items = [...previousItems, ...result.items];

        const merged: QueryResult = {
          items,
          count: items.length,
          requestCharge: previousCharge + result.requestCharge,
          continuationToken: result.continuationToken,
        };
        return { ...tab, results: merged, error: null, isLoading: false };
      }),
    })),
}));
