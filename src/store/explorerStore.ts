import { create } from "zustand";

interface ExplorerState {
  expandedDatabases: Set<string>;
  selectedDatabaseId: string | null;
  selectedContainerId: string | null;
  toggleDatabase: (dbId: string) => void;
  selectContainer: (dbId: string, containerId: string) => void;
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  expandedDatabases: new Set<string>(),
  selectedDatabaseId: null,
  selectedContainerId: null,

  toggleDatabase: (dbId) =>
    set((state) => {
      const expanded = new Set(state.expandedDatabases);
      if (expanded.has(dbId)) {
        expanded.delete(dbId);
      } else {
        expanded.add(dbId);
      }
      return { expandedDatabases: expanded };
    }),

  selectContainer: (dbId, containerId) =>
    set({ selectedDatabaseId: dbId, selectedContainerId: containerId }),
}));
