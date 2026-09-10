import { create } from "zustand";

const STORAGE_KEY = "cosmos-selected-result";

function readStoredSelections(): Record<string, string> {
  if (typeof sessionStorage === "undefined") return {};
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const parsed: unknown = JSON.parse(stored);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

function persistSelections(selections: Record<string, string>): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selections));
}

interface SelectedResultState {
  /** Subtab id -> selected row's item key (see getResultItemKey). */
  selections: Record<string, string>;
  setSelection: (subtabId: string, key: string) => void;
  clearSelection: (subtabId: string) => void;
  pruneSelections: (validSubtabIds: Set<string>) => void;
}

export const useSelectedResultStore = create<SelectedResultState>(
  (set, get) => ({
    selections: readStoredSelections(),

    setSelection: (subtabId, key) => {
      const selections = { ...get().selections, [subtabId]: key };
      persistSelections(selections);
      set({ selections });
    },

    clearSelection: (subtabId) => {
      const current = get().selections;
      if (!(subtabId in current)) return;
      const selections = Object.fromEntries(
        Object.entries(current).filter(([id]) => id !== subtabId),
      );
      persistSelections(selections);
      set({ selections });
    },

    pruneSelections: (validSubtabIds) => {
      const current = get().selections;
      const entries = Object.entries(current).filter(([id]) =>
        validSubtabIds.has(id),
      );
      if (entries.length === Object.keys(current).length) return;
      const selections = Object.fromEntries(entries);
      persistSelections(selections);
      set({ selections });
    },
  }),
);
