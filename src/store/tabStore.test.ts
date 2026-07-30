import { beforeEach, describe, expect, it } from "vitest";
import { makeTabId, useTabStore } from "./tabStore";
import type { QueryResult } from "@/types/cosmos";

function reset() {
  useTabStore.setState({ tabs: [], activeTabId: null });
}

function page(
  items: unknown[],
  continuationToken: string | null,
  requestCharge: number,
): QueryResult {
  return { items, count: items.length, requestCharge, continuationToken };
}

describe("tabStore", () => {
  beforeEach(reset);

  it("opens a new tab with the default query and activates it", () => {
    useTabStore.getState().openTab("db1", "c1");
    const { tabs, activeTabId } = useTabStore.getState();

    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).toBe(makeTabId("db1", "c1"));
    expect(tabs[0].query).toBe("SELECT * FROM c");
    expect(tabs[0].label).toBe("db1 / c1");
    expect(activeTabId).toBe(tabs[0].id);
  });

  it("openTab is idempotent — activates existing tab instead of duplicating", () => {
    const { openTab } = useTabStore.getState();
    openTab("db1", "c1");
    openTab("db1", "c2");
    openTab("db1", "c1");

    const { tabs, activeTabId } = useTabStore.getState();
    expect(tabs).toHaveLength(2);
    expect(activeTabId).toBe(makeTabId("db1", "c1"));
  });

  it("closes a tab and activates a neighbor", () => {
    const { openTab, closeTab } = useTabStore.getState();
    openTab("db1", "c1");
    openTab("db1", "c2");
    openTab("db1", "c3");

    closeTab(makeTabId("db1", "c2"));
    let state = useTabStore.getState();
    expect(state.tabs.map((t) => t.id)).toEqual([
      makeTabId("db1", "c1"),
      makeTabId("db1", "c3"),
    ]);

    // Closing the active (last-opened c3) activates a neighbor.
    useTabStore.getState().setActiveTab(makeTabId("db1", "c3"));
    closeTab(makeTabId("db1", "c3"));
    state = useTabStore.getState();
    expect(state.activeTabId).toBe(makeTabId("db1", "c1"));

    closeTab(makeTabId("db1", "c1"));
    expect(useTabStore.getState().activeTabId).toBeNull();
  });

  it("replace mode sets results fresh and resets RU", () => {
    const { openTab, applyQueryResult } = useTabStore.getState();
    openTab("db1", "c1");
    const id = makeTabId("db1", "c1");

    applyQueryResult(id, page([{ a: 1 }], "tok1", 2.5), "replace");
    let tab = useTabStore.getState().tabs[0];
    expect(tab.results?.items).toEqual([{ a: 1 }]);
    expect(tab.results?.requestCharge).toBe(2.5);
    expect(tab.results?.continuationToken).toBe("tok1");

    // A second replace resets accumulated items + RU.
    applyQueryResult(id, page([{ b: 2 }], null, 1), "replace");
    tab = useTabStore.getState().tabs[0];
    expect(tab.results?.items).toEqual([{ b: 2 }]);
    expect(tab.results?.requestCharge).toBe(1);
    expect(tab.results?.continuationToken).toBeNull();
  });

  it("append mode accumulates items and RU and advances the token", () => {
    const { openTab, applyQueryResult } = useTabStore.getState();
    openTab("db1", "c1");
    const id = makeTabId("db1", "c1");

    applyQueryResult(id, page([{ a: 1 }], "tok1", 2), "replace");
    applyQueryResult(id, page([{ b: 2 }], "tok2", 3), "append");
    applyQueryResult(id, page([{ c: 3 }], null, 1.5), "append");

    const tab = useTabStore.getState().tabs[0];
    expect(tab.results?.items).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
    expect(tab.results?.count).toBe(3);
    expect(tab.results?.requestCharge).toBe(6.5);
    expect(tab.results?.continuationToken).toBeNull();
  });

  it("setTabError clears loading and records the error", () => {
    const { openTab, setTabLoading, setTabError } = useTabStore.getState();
    openTab("db1", "c1");
    const id = makeTabId("db1", "c1");

    setTabLoading(id, true);
    setTabError(id, { message: "boom", code: 400 });
    const tab = useTabStore.getState().tabs[0];
    expect(tab.isLoading).toBe(false);
    expect(tab.error).toEqual({ message: "boom", code: 400 });
  });
});
