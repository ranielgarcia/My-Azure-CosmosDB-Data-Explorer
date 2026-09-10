import { create } from "zustand";
import {
  defaultResultColumns,
  discoverResultColumns,
} from "@/lib/queryResultTable";
import { useSelectedResultStore } from "@/store/selectedResultStore";
import type { QueryError, QueryResult } from "@/types/cosmos";
import type {
  PaneState,
  QueryWorkspaceState,
  ResultDisplayMode,
  SubtabState,
  TabSession,
  TabState,
} from "@/types/tabs";

const DEFAULT_QUERY = "SELECT * FROM c";
const DEFAULT_SUBTAB_NAME = "Query 1";
export const MAX_PANES = 3;

export function makeTabId(dbId: string, containerId: string): string {
  return `${dbId}__${containerId}`;
}

interface TabStore {
  tabs: TabState[];
  panes: PaneState[];
  activePaneId: string | null;
  /** True once the persisted session has been loaded from the server. */
  hydrated: boolean;

  openTab: (dbId: string, containerId: string) => void;
  closeTab: (id: string) => void;
  setActiveTab: (paneId: string, tabId: string) => void;
  setActivePane: (paneId: string) => void;
  addSubtab: (tabId: string) => void;
  renameSubtab: (tabId: string, subtabId: string, name: string) => boolean;
  closeSubtab: (tabId: string, subtabId: string) => void;
  setActiveSubtab: (tabId: string, subtabId: string) => void;
  updateQuery: (subtabId: string, query: string) => void;
  setResultDisplayMode: (subtabId: string, mode: ResultDisplayMode) => void;
  setResultColumns: (subtabId: string, columns: string[]) => void;
  setTabLoading: (subtabId: string, isLoading: boolean) => void;
  setTabError: (subtabId: string, error: QueryError) => void;
  moveTab: (tabId: string, targetPaneId: string, targetIndex: number) => void;
  splitTab: (tabId: string, edge: "left" | "right") => void;
  setPaneWidths: (widths: Record<string, number>) => void;
  /** Replace the in-memory tabs from a persisted session (results start empty). */
  hydrate: (session: TabSession) => void;
  /**
   * Apply a page of query results.
   * - `replace` (fresh run): results become this page; RU resets.
   * - `append` (load more): items appended, RU accumulated, token advanced.
   */
  applyQueryResult: (
    subtabId: string,
    result: QueryResult,
    mode: "replace" | "append",
  ) => void;
}

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function makeSubtab(name = DEFAULT_SUBTAB_NAME): SubtabState {
  return {
    id: makeId("subtab"),
    name,
    query: DEFAULT_QUERY,
    resultDisplayMode: "json",
    resultColumns: [],
    results: null,
    error: null,
    isLoading: false,
  };
}

function updateSubtab(
  tabs: TabState[],
  subtabId: string,
  updater: (subtab: SubtabState) => SubtabState,
): TabState[] {
  return tabs.map((tab) => ({
    ...tab,
    subtabs: tab.subtabs.map((subtab) =>
      subtab.id === subtabId ? updater(subtab) : subtab,
    ),
  }));
}

function normalizePaneWidths(panes: PaneState[]): PaneState[] {
  if (panes.length === 0) return panes;
  const total = panes.reduce((sum, pane) => sum + pane.width, 0);
  const divisor = total > 0 ? total : panes.length;
  return panes.map((pane) => ({
    ...pane,
    width: total > 0 ? pane.width / divisor : 1 / divisor,
  }));
}

function removeTabFromPane(pane: PaneState, tabId: string): PaneState | null {
  const index = pane.tabIds.indexOf(tabId);
  if (index === -1) return pane;
  const tabIds = pane.tabIds.filter((id) => id !== tabId);
  if (tabIds.length === 0) return null;
  const activeTabId =
    pane.activeTabId === tabId
      ? (tabIds[index] ?? tabIds[index - 1])
      : pane.activeTabId;
  return { ...pane, tabIds, activeTabId };
}

export function selectWorkspace(
  tabs: TabState[],
  tabId: string,
): QueryWorkspaceState | null {
  const tab = tabs.find((candidate) => candidate.id === tabId);
  const subtab = tab?.subtabs.find(
    (candidate) => candidate.id === tab.activeSubtabId,
  );
  if (!tab || !subtab) return null;
  return {
    ...subtab,
    parentTabId: tab.id,
    databaseId: tab.databaseId,
    containerId: tab.containerId,
    label: tab.label,
  };
}

export const useTabStore = create<TabStore>((set) => ({
  tabs: [],
  panes: [],
  activePaneId: null,
  hydrated: false,

  openTab: (dbId, containerId) =>
    set((state) => {
      const id = makeTabId(dbId, containerId);
      if (state.tabs.some((tab) => tab.id === id)) {
        const pane = state.panes.find((candidate) =>
          candidate.tabIds.includes(id),
        );
        return pane
          ? {
              panes: state.panes.map((candidate) =>
                candidate.id === pane.id
                  ? { ...candidate, activeTabId: id }
                  : candidate,
              ),
              activePaneId: pane.id,
            }
          : state;
      }
      const subtab = makeSubtab();
      const tab: TabState = {
        id,
        databaseId: dbId,
        containerId,
        label: `${dbId} / ${containerId}`,
        subtabs: [subtab],
        activeSubtabId: subtab.id,
      };
      if (state.panes.length === 0) {
        const paneId = makeId("pane");
        return {
          tabs: [tab],
          panes: [{ id: paneId, tabIds: [id], activeTabId: id, width: 1 }],
          activePaneId: paneId,
        };
      }
      const paneId = state.activePaneId ?? state.panes[0].id;
      return {
        tabs: [...state.tabs, tab],
        panes: state.panes.map((pane) =>
          pane.id === paneId
            ? { ...pane, tabIds: [...pane.tabIds, id], activeTabId: id }
            : pane,
        ),
        activePaneId: paneId,
      };
    }),

  closeTab: (id) =>
    set((state) => {
      const closedTab = state.tabs.find((tab) => tab.id === id);
      if (!closedTab) return state;
      const tabs = state.tabs.filter((tab) => tab.id !== id);
      let panes = state.panes
        .map((pane) => removeTabFromPane(pane, id))
        .filter((pane): pane is PaneState => pane !== null);
      panes = normalizePaneWidths(panes);
      const activePaneId = panes.some((pane) => pane.id === state.activePaneId)
        ? state.activePaneId
        : (panes[0]?.id ?? null);
      for (const subtab of closedTab.subtabs) {
        useSelectedResultStore.getState().clearSelection(subtab.id);
      }
      return { tabs, panes, activePaneId };
    }),

  setActiveTab: (paneId, tabId) =>
    set((state) => ({
      panes: state.panes.map((pane) =>
        pane.id === paneId && pane.tabIds.includes(tabId)
          ? { ...pane, activeTabId: tabId }
          : pane,
      ),
      activePaneId: paneId,
    })),

  setActivePane: (paneId) => set({ activePaneId: paneId }),

  addSubtab: (tabId) =>
    set((state) => ({
      tabs: state.tabs.map((tab) => {
        if (tab.id !== tabId) return tab;
        const subtab = makeSubtab(`Query ${tab.subtabs.length + 1}`);
        return {
          ...tab,
          subtabs: [...tab.subtabs, subtab],
          activeSubtabId: subtab.id,
        };
      }),
    })),

  renameSubtab: (tabId, subtabId, name) => {
    const normalized = name.trim();
    if (!normalized || normalized.length > 80) return false;
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              subtabs: tab.subtabs.map((subtab) =>
                subtab.id === subtabId
                  ? { ...subtab, name: normalized }
                  : subtab,
              ),
            }
          : tab,
      ),
    }));
    return true;
  },

  closeSubtab: (tabId, subtabId) =>
    set((state) => {
      const tabs = state.tabs.map((tab) => {
        if (tab.id !== tabId || tab.subtabs.length === 1) return tab;
        const index = tab.subtabs.findIndex((subtab) => subtab.id === subtabId);
        if (index === -1) return tab;
        const subtabs = tab.subtabs.filter((subtab) => subtab.id !== subtabId);
        const activeSubtabId =
          tab.activeSubtabId === subtabId
            ? (subtabs[index] ?? subtabs[index - 1]).id
            : tab.activeSubtabId;
        useSelectedResultStore.getState().clearSelection(subtabId);
        return { ...tab, subtabs, activeSubtabId };
      });
      return { tabs };
    }),

  setActiveSubtab: (tabId, subtabId) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId && tab.subtabs.some((subtab) => subtab.id === subtabId)
          ? { ...tab, activeSubtabId: subtabId }
          : tab,
      ),
    })),

  hydrate: (session) =>
    set(() => {
      const tabs: TabState[] = session.tabs.map((tab) => ({
        ...tab,
        subtabs: tab.subtabs.map((subtab) => ({
          ...subtab,
          resultDisplayMode: subtab.resultDisplayMode ?? "json",
          resultColumns: subtab.resultColumns ?? [],
          results: null,
          error: null,
          isLoading: false,
        })),
      }));
      const validSubtabIds = new Set(
        tabs.flatMap((tab) => tab.subtabs.map((subtab) => subtab.id)),
      );
      useSelectedResultStore.getState().pruneSelections(validSubtabIds);
      return {
        tabs,
        panes: normalizePaneWidths(session.panes),
        activePaneId: session.activePaneId,
        hydrated: true,
      };
    }),

  updateQuery: (subtabId, query) =>
    set((state) => ({
      tabs: updateSubtab(state.tabs, subtabId, (subtab) => ({
        ...subtab,
        query,
      })),
    })),

  setResultDisplayMode: (subtabId, resultDisplayMode) =>
    set((state) => ({
      tabs: updateSubtab(state.tabs, subtabId, (subtab) => ({
        ...subtab,
        resultDisplayMode,
      })),
    })),

  setResultColumns: (subtabId, resultColumns) =>
    set((state) => ({
      tabs: updateSubtab(state.tabs, subtabId, (subtab) => ({
        ...subtab,
        resultColumns,
      })),
    })),

  setTabLoading: (subtabId, isLoading) =>
    set((state) => ({
      tabs: updateSubtab(state.tabs, subtabId, (subtab) => ({
        ...subtab,
        isLoading,
        error: isLoading ? null : subtab.error,
      })),
    })),

  setTabError: (subtabId, error) =>
    set((state) => ({
      tabs: updateSubtab(state.tabs, subtabId, (subtab) => ({
        ...subtab,
        error,
        isLoading: false,
      })),
    })),

  applyQueryResult: (subtabId, result, mode) =>
    set((state) => ({
      tabs: updateSubtab(state.tabs, subtabId, (subtab) => {
        const previousItems =
          mode === "append" && subtab.results ? subtab.results.items : [];
        const previousCharge =
          mode === "append" && subtab.results
            ? subtab.results.requestCharge
            : 0;
        const items = [...previousItems, ...result.items];
        const resultColumns =
          subtab.resultColumns.length > 0
            ? subtab.resultColumns
            : defaultResultColumns(discoverResultColumns(items));

        const merged: QueryResult = {
          items,
          count: items.length,
          requestCharge: previousCharge + result.requestCharge,
          continuationToken: result.continuationToken,
        };
        return {
          ...subtab,
          resultColumns,
          results: merged,
          error: null,
          isLoading: false,
        };
      }),
    })),

  moveTab: (tabId, targetPaneId, targetIndex) =>
    set((state) => {
      const sourcePane = state.panes.find((pane) =>
        pane.tabIds.includes(tabId),
      );
      if (
        !sourcePane ||
        !state.panes.some((pane) => pane.id === targetPaneId)
      ) {
        return state;
      }
      const paneCandidates = state.panes.map((pane) => {
        if (pane.id !== targetPaneId) {
          return removeTabFromPane(pane, tabId);
        }
        const tabIds = pane.tabIds.filter((id) => id !== tabId);
        const index = Math.max(0, Math.min(targetIndex, tabIds.length));
        tabIds.splice(index, 0, tabId);
        return { ...pane, tabIds, activeTabId: tabId };
      });
      const panes = normalizePaneWidths(
        paneCandidates.filter((pane): pane is PaneState => pane !== null),
      );
      return { panes, activePaneId: targetPaneId };
    }),

  splitTab: (tabId, edge) =>
    set((state) => {
      if (state.panes.length >= MAX_PANES) return state;
      const sourcePane = state.panes.find((pane) =>
        pane.tabIds.includes(tabId),
      );
      if (
        !sourcePane ||
        (state.panes.length === 1 && sourcePane.tabIds.length === 1)
      ) {
        return state;
      }
      const paneId = makeId("pane");
      const panes = state.panes
        .map((pane) =>
          pane.id === sourcePane.id ? removeTabFromPane(pane, tabId) : pane,
        )
        .filter((pane): pane is PaneState => pane !== null);
      const newPane: PaneState = {
        id: paneId,
        tabIds: [tabId],
        activeTabId: tabId,
        width: 1 / (panes.length + 1),
      };
      const nextPanes =
        edge === "left" ? [newPane, ...panes] : [...panes, newPane];
      return {
        panes: normalizePaneWidths(nextPanes),
        activePaneId: paneId,
      };
    }),

  setPaneWidths: (widths) =>
    set((state) => ({
      panes: normalizePaneWidths(
        state.panes.map((pane) => ({
          ...pane,
          width: widths[pane.id] ?? pane.width,
        })),
      ),
    })),
}));
