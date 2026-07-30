import { useEffect } from "react";
import { fetchTabSession, saveTabSession } from "@/services/cosmos/api";
import { useTabStore } from "@/store/tabStore";
import type { TabSession, TabState } from "@/types/tabs";

const SAVE_DEBOUNCE_MS = 1000;
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

/** Extract the durable snapshot persisted server-side (results are excluded). */
function toSession(tabs: TabState[], activeTabId: string | null): TabSession {
  return {
    tabs: tabs.map((tab) => ({
      id: tab.id,
      databaseId: tab.databaseId,
      containerId: tab.containerId,
      label: tab.label,
      query: tab.query,
    })),
    activeTabId,
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
    fetchTabSession()
      .then((session) => {
        if (!cancelled) useTabStore.getState().hydrate(session);
      })
      .catch(() => {
        // Persistence is best-effort; start with an empty session on failure.
        if (!cancelled)
          useTabStore.getState().hydrate({ tabs: [], activeTabId: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave on change (debounced) plus a final flush on unload.
  useEffect(() => {
    if (!hydrated) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const scheduleSave = (tabs: TabState[], activeTabId: string | null) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void saveTabSession(toSession(tabs, activeTabId)).catch(() => {
          // Best-effort autosave; ignore transient failures.
        });
      }, SAVE_DEBOUNCE_MS);
    };

    const unsubscribe = useTabStore.subscribe((state, prev) => {
      // Only persist when the durable snapshot could have changed.
      if (state.tabs === prev.tabs && state.activeTabId === prev.activeTabId) {
        return;
      }
      scheduleSave(state.tabs, state.activeTabId);
    });

    const flushOnUnload = () => {
      if (timer) clearTimeout(timer);
      const { tabs, activeTabId } = useTabStore.getState();
      const body = JSON.stringify(toSession(tabs, activeTabId));
      // keepalive lets the request outlive the unloading page.
      void fetch(`${BASE_URL}/tabs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {
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
