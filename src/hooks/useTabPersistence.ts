import { useEffect } from "react";
import {
  clearTabSession,
  fetchTabSession,
  saveTabSession,
} from "@/services/cosmos/api";
import { useTabStore } from "@/store/tabStore";
import type { PaneState, TabSession, TabState } from "@/types/tabs";

const SAVE_DEBOUNCE_MS = 1000;
const HYDRATION_RETRY_MS = 1000;
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

/** Extract the durable snapshot persisted server-side (results are excluded). */
export function toSession(
  tabs: TabState[],
  panes: PaneState[],
  activePaneId: string | null,
): TabSession {
  return {
    tabs: tabs.map((tab) => ({
      id: tab.id,
      databaseId: tab.databaseId,
      containerId: tab.containerId,
      label: tab.label,
      subtabs: tab.subtabs.map(
        ({ id, name, query, resultDisplayMode, resultColumns }) => ({
          id,
          name,
          query,
          resultDisplayMode,
          resultColumns,
        }),
      ),
      activeSubtabId: tab.activeSubtabId,
    })),
    panes,
    activePaneId,
  };
}

/**
 * Loads the persisted tab session on mount and autosaves changes back to the
 * proxy. Saves are debounced (~1s, well under the 5s target) and skipped until
 * the initial hydration completes so an empty store can't clobber saved tabs.
 */
export function useTabPersistence(): boolean {
  const hydrated = useTabStore((s) => s.hydrated);

  // Hydrate once from the server.
  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const hydrate = () => {
      void fetchTabSession()
        .then((session) => {
          if (!cancelled) useTabStore.getState().hydrate(session);
        })
        .catch(() => {
          // A transient proxy restart is not an authoritative empty session.
          // Keep autosave disabled until a successful hydration completes.
          if (!cancelled) retryTimer = setTimeout(hydrate, HYDRATION_RETRY_MS);
        });
    };

    hydrate();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  // Autosave on change (debounced) plus a final flush on unload.
  useEffect(() => {
    if (!hydrated) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleSave = (
      tabs: TabState[],
      panes: PaneState[],
      activePaneId: string | null,
    ) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (tabs.length === 0) {
          void clearTabSession().catch(() => {
            // Best-effort autosave; ignore transient failures.
          });
        } else {
          void saveTabSession(toSession(tabs, panes, activePaneId)).catch(
            () => {
              // Best-effort autosave; ignore transient failures.
            },
          );
        }
      }, SAVE_DEBOUNCE_MS);
    };

    const unsubscribe = useTabStore.subscribe((state, prev) => {
      // Only persist when the durable snapshot could have changed.
      if (
        state.tabs === prev.tabs &&
        state.panes === prev.panes &&
        state.activePaneId === prev.activePaneId
      ) {
        return;
      }
      scheduleSave(state.tabs, state.panes, state.activePaneId);
    });

    const flushOnUnload = () => {
      if (timer) clearTimeout(timer);
      const { tabs, panes, activePaneId } = useTabStore.getState();
      // keepalive lets the request outlive the unloading page.
      const request =
        tabs.length === 0
          ? fetch(`${BASE_URL}/tabs`, { method: "DELETE", keepalive: true })
          : fetch(`${BASE_URL}/tabs`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(toSession(tabs, panes, activePaneId)),
              keepalive: true,
            });
      void request.catch(() => {
        // Ignore — the debounced save has likely already persisted state.
      });
    };

    window.addEventListener("beforeunload", flushOnUnload);

    return () => {
      unsubscribe();
      window.removeEventListener("beforeunload", flushOnUnload);
      if (timer) clearTimeout(timer);
    };
  }, [hydrated]);

  return hydrated;
}
