import { beforeEach, describe, expect, it, vi } from "vitest";

function createLocalStorageMock(): Storage {
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

vi.stubGlobal("localStorage", createLocalStorageMock());

// Imported after the global stub so the store's module-level reads succeed.
const {
  DEFAULT_SIDEBAR_WIDTH,
  DEFAULT_STORE_PANEL_HEIGHT,
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  MIN_STORE_PANEL_HEIGHT,
  MAX_RIGHT_SIDEBAR_WIDTH,
  MIN_RIGHT_SIDEBAR_WIDTH,
  useLayoutStore,
} = await import("./layoutStore");

function reset() {
  localStorage.clear();
  useLayoutStore.setState({
    sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
    storePanelHeight: DEFAULT_STORE_PANEL_HEIGHT,
  });
}

describe("layoutStore", () => {
  beforeEach(reset);

  it("clamps the sidebar width to its bounds", () => {
    const { setSidebarWidth } = useLayoutStore.getState();

    setSidebarWidth(10_000);
    expect(useLayoutStore.getState().sidebarWidth).toBe(MAX_SIDEBAR_WIDTH);

    setSidebarWidth(0);
    expect(useLayoutStore.getState().sidebarWidth).toBe(MIN_SIDEBAR_WIDTH);
  });

  it("clamps the store panel height to a provided max", () => {
    const { setStorePanelHeight } = useLayoutStore.getState();

    setStorePanelHeight(500, 300);
    expect(useLayoutStore.getState().storePanelHeight).toBe(300);

    setStorePanelHeight(10, 300);
    expect(useLayoutStore.getState().storePanelHeight).toBe(
      MIN_STORE_PANEL_HEIGHT,
    );
  });

  it("persists the clamped sidebar width to localStorage", () => {
    useLayoutStore.getState().setSidebarWidth(320);
    expect(localStorage.getItem("cosmos-sidebar-width")).toBe("320");
  });

  it("resets dimensions back to their defaults", () => {
    const state = useLayoutStore.getState();
    state.setSidebarWidth(400);
    state.setStorePanelHeight(400);

    state.resetSidebarWidth();
    state.resetStorePanelHeight();

    expect(useLayoutStore.getState().sidebarWidth).toBe(DEFAULT_SIDEBAR_WIDTH);
    expect(useLayoutStore.getState().storePanelHeight).toBe(
      DEFAULT_STORE_PANEL_HEIGHT,
    );
  });

  it("toggles and persists the saved-queries panel open state", () => {
    const initial = useLayoutStore.getState().savedQueriesOpen;

    useLayoutStore.getState().toggleSavedQueries();
    expect(useLayoutStore.getState().savedQueriesOpen).toBe(!initial);
    expect(localStorage.getItem("cosmos-saved-queries-open")).toBe(
      String(!initial),
    );

    useLayoutStore.getState().setSavedQueriesOpen(true);
    expect(useLayoutStore.getState().savedQueriesOpen).toBe(true);
    expect(localStorage.getItem("cosmos-saved-queries-open")).toBe("true");
  });

  it("clamps and persists the right sidebar width", () => {
    const { setRightSidebarWidth } = useLayoutStore.getState();

    setRightSidebarWidth(10_000);
    expect(useLayoutStore.getState().rightSidebarWidth).toBe(
      MAX_RIGHT_SIDEBAR_WIDTH,
    );

    setRightSidebarWidth(0);
    expect(useLayoutStore.getState().rightSidebarWidth).toBe(
      MIN_RIGHT_SIDEBAR_WIDTH,
    );
    expect(localStorage.getItem("cosmos-right-sidebar-width")).toBe(
      String(MIN_RIGHT_SIDEBAR_WIDTH),
    );
  });
});
