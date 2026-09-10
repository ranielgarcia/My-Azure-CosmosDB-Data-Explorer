import { useEffect } from "react";
import { fetchSelectedStore, saveSelectedStore } from "@/services/cosmos/api";
import { useSelectedStoreStore } from "@/store/selectedStoreStore";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

/**
 * Loads the persisted store selection on mount and saves changes back to the
 * proxy immediately (selection is a discrete click, not keystrokes, so no
 * debounce is needed). Saves are skipped until hydration completes so an
 * empty store can't clobber a previously persisted selection.
 */
export function useSelectedStorePersistence(): boolean {
  const hydrated = useSelectedStoreStore((s) => s.hydrated);

  // Hydrate once from the server.
  useEffect(() => {
    let cancelled = false;
    fetchSelectedStore()
      .then((storeId) => {
        if (!cancelled) useSelectedStoreStore.getState().hydrate(storeId);
      })
      .catch(() => {
        // Persistence is best-effort; start with no selection on failure.
        if (!cancelled) useSelectedStoreStore.getState().hydrate(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Autosave on change, plus a final flush on unload.
  useEffect(() => {
    if (!hydrated) return;

    const unsubscribe = useSelectedStoreStore.subscribe((state, prev) => {
      if (state.selectedStoreId === prev.selectedStoreId) return;
      void saveSelectedStore(state.selectedStoreId).catch(() => {
        // Best-effort autosave; ignore transient failures.
      });
    });

    const flushOnUnload = () => {
      const { selectedStoreId } = useSelectedStoreStore.getState();
      const body = JSON.stringify({ storeId: selectedStoreId });
      // keepalive lets the request outlive the unloading page.
      void fetch(`${BASE_URL}/selected-store`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {
        // Ignore — the change-triggered save has likely already persisted it.
      });
    };

    window.addEventListener("beforeunload", flushOnUnload);

    return () => {
      unsubscribe();
      window.removeEventListener("beforeunload", flushOnUnload);
    };
  }, [hydrated]);

  return hydrated;
}
