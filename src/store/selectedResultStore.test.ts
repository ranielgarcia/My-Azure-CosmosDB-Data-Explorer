import { beforeEach, describe, expect, it, vi } from "vitest";

function createSessionStorageMock(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  };
}

vi.stubGlobal("sessionStorage", createSessionStorageMock());

// Imported after the global stub so the store's module-level reads succeed.
const { useSelectedResultStore } = await import("./selectedResultStore");

function reset() {
  sessionStorage.clear();
  useSelectedResultStore.setState({ selections: {} });
}

describe("selectedResultStore", () => {
  beforeEach(reset);

  it("sets a selection and persists it to sessionStorage", () => {
    useSelectedResultStore.getState().setSelection("subtab-1", "id:abc");

    expect(useSelectedResultStore.getState().selections).toEqual({
      "subtab-1": "id:abc",
    });
    expect(sessionStorage.getItem("cosmos-selected-result")).toBe(
      JSON.stringify({ "subtab-1": "id:abc" }),
    );
  });

  it("overwrites an existing selection for the same subtab", () => {
    const { setSelection } = useSelectedResultStore.getState();
    setSelection("subtab-1", "id:abc");
    setSelection("subtab-1", "idx:2");

    expect(useSelectedResultStore.getState().selections).toEqual({
      "subtab-1": "idx:2",
    });
  });

  it("clears a selection and removes it from storage", () => {
    const { setSelection, clearSelection } = useSelectedResultStore.getState();
    setSelection("subtab-1", "id:abc");
    setSelection("subtab-2", "id:xyz");

    clearSelection("subtab-1");

    expect(useSelectedResultStore.getState().selections).toEqual({
      "subtab-2": "id:xyz",
    });
    expect(sessionStorage.getItem("cosmos-selected-result")).toBe(
      JSON.stringify({ "subtab-2": "id:xyz" }),
    );
  });

  it("is a no-op when clearing a subtab with no selection", () => {
    useSelectedResultStore.getState().setSelection("subtab-1", "id:abc");
    const before = useSelectedResultStore.getState().selections;

    useSelectedResultStore.getState().clearSelection("missing-subtab");

    expect(useSelectedResultStore.getState().selections).toBe(before);
  });

  it("prunes selections not in the valid id set", () => {
    const { setSelection, pruneSelections } = useSelectedResultStore.getState();
    setSelection("subtab-1", "id:abc");
    setSelection("subtab-2", "id:xyz");

    pruneSelections(new Set(["subtab-2"]));

    expect(useSelectedResultStore.getState().selections).toEqual({
      "subtab-2": "id:xyz",
    });
    expect(sessionStorage.getItem("cosmos-selected-result")).toBe(
      JSON.stringify({ "subtab-2": "id:xyz" }),
    );
  });

  it("is a no-op when pruning removes nothing", () => {
    useSelectedResultStore.getState().setSelection("subtab-1", "id:abc");
    const before = useSelectedResultStore.getState().selections;

    useSelectedResultStore.getState().pruneSelections(new Set(["subtab-1"]));

    expect(useSelectedResultStore.getState().selections).toBe(before);
  });

  it("reads an initial selection previously persisted to sessionStorage", async () => {
    sessionStorage.setItem(
      "cosmos-selected-result",
      JSON.stringify({ "subtab-1": "id:abc" }),
    );

    vi.resetModules();
    const { useSelectedResultStore: reloaded } =
      await import("./selectedResultStore");

    expect(reloaded.getState().selections).toEqual({ "subtab-1": "id:abc" });
  });
});
