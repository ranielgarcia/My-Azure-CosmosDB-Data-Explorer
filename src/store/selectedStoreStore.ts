import { create } from "zustand";

interface SelectedStoreState {
  /** RowKey / StoreId of the currently selected store, or null when none. */
  selectedStoreId: string | null;
  /** IANA time zone of the selected store (e.g. "Australia/Perth"), or null. */
  timeZone: string | null;
  /** True once the persisted selection has been loaded from the server. */
  hydrated: boolean;
  setSelectedStoreId: (storeId: string | null) => void;
  setTimeZone: (timeZone: string | null) => void;
  /** Apply the persisted selection loaded from the server. */
  hydrate: (storeId: string | null) => void;
}

/**
 * Holds the store currently selected in the left-panel Store Details view so that
 * unrelated features (e.g. the JSON results viewer) can localise UTC dates to the
 * store's time zone without prop-drilling.
 */
export const useSelectedStoreStore = create<SelectedStoreState>((set) => ({
  selectedStoreId: null,
  timeZone: null,
  hydrated: false,
  setSelectedStoreId: (selectedStoreId) => set({ selectedStoreId }),
  setTimeZone: (timeZone) => set({ timeZone }),
  hydrate: (storeId) => set({ selectedStoreId: storeId, hydrated: true }),
}));
