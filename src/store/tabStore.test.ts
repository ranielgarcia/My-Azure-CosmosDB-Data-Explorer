import { beforeEach, describe, expect, it } from "vitest";
import { makeTabId, MAX_PANES, useTabStore } from "./tabStore";
import { useSelectedResultStore } from "./selectedResultStore";
import { toSession } from "@/hooks/useTabPersistence";
import type { QueryResult } from "@/types/cosmos";

function reset() {
  useTabStore.setState({
    tabs: [],
    panes: [],
    activePaneId: null,
    hydrated: false,
  });
  useSelectedResultStore.setState({ selections: {} });
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
    const { tabs, panes, activePaneId } = useTabStore.getState();

    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).toBe(makeTabId("db1", "c1"));
    expect(tabs[0].subtabs[0].query).toBe("SELECT * FROM c");
    expect(tabs[0].subtabs[0].name).toBe("Query 1");
    expect(tabs[0].subtabs[0].resultDisplayMode).toBe("json");
    expect(tabs[0].subtabs[0].resultColumns).toEqual([]);
    expect(tabs[0].label).toBe("db1 / c1");
    expect(panes[0].activeTabId).toBe(tabs[0].id);
    expect(activePaneId).toBe(panes[0].id);
  });

  it("openTab is idempotent — activates existing tab instead of duplicating", () => {
    const { openTab } = useTabStore.getState();
    openTab("db1", "c1");
    openTab("db1", "c2");
    openTab("db1", "c1");

    const { tabs, panes } = useTabStore.getState();
    expect(tabs).toHaveLength(2);
    expect(panes[0].activeTabId).toBe(makeTabId("db1", "c1"));
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
    const paneId = state.panes[0].id;
    useTabStore.getState().setActiveTab(paneId, makeTabId("db1", "c3"));
    closeTab(makeTabId("db1", "c3"));
    state = useTabStore.getState();
    expect(state.panes[0].activeTabId).toBe(makeTabId("db1", "c1"));

    closeTab(makeTabId("db1", "c1"));
    expect(useTabStore.getState().activePaneId).toBeNull();
  });

  it("removes a pane atomically when its final tab closes", () => {
    useTabStore.getState().openTab("db1", "c1");

    useTabStore.getState().closeTab(makeTabId("db1", "c1"));

    expect(useTabStore.getState()).toMatchObject({
      tabs: [],
      panes: [],
      activePaneId: null,
    });
  });

  it("closeTab clears cached selections for all of its subtabs", () => {
    const { openTab, addSubtab, closeTab } = useTabStore.getState();
    openTab("db1", "c1");
    const tabId = makeTabId("db1", "c1");
    const firstSubtabId = useTabStore.getState().tabs[0].activeSubtabId;
    addSubtab(tabId);
    const secondSubtabId = useTabStore.getState().tabs[0].activeSubtabId;

    const { setSelection } = useSelectedResultStore.getState();
    setSelection(firstSubtabId, "id:1");
    setSelection(secondSubtabId, "id:2");

    closeTab(tabId);

    expect(useSelectedResultStore.getState().selections).toEqual({});
  });

  it("replace mode sets results fresh and resets RU", () => {
    const { openTab, applyQueryResult } = useTabStore.getState();
    openTab("db1", "c1");
    const id = useTabStore.getState().tabs[0].activeSubtabId;

    applyQueryResult(id, page([{ a: 1 }], "tok1", 2.5), "replace");
    let subtab = useTabStore.getState().tabs[0].subtabs[0];
    expect(subtab.results?.items).toEqual([{ a: 1 }]);
    expect(subtab.results?.requestCharge).toBe(2.5);
    expect(subtab.results?.continuationToken).toBe("tok1");

    // A second replace resets accumulated items + RU.
    applyQueryResult(id, page([{ b: 2 }], null, 1), "replace");
    subtab = useTabStore.getState().tabs[0].subtabs[0];
    expect(subtab.results?.items).toEqual([{ b: 2 }]);
    expect(subtab.results?.requestCharge).toBe(1);
    expect(subtab.results?.continuationToken).toBeNull();
  });

  it("append mode accumulates items and RU and advances the token", () => {
    const { openTab, applyQueryResult } = useTabStore.getState();
    openTab("db1", "c1");
    const id = useTabStore.getState().tabs[0].activeSubtabId;

    applyQueryResult(id, page([{ a: 1 }], "tok1", 2), "replace");
    applyQueryResult(id, page([{ b: 2 }], "tok2", 3), "append");
    applyQueryResult(id, page([{ c: 3 }], null, 1.5), "append");

    const subtab = useTabStore.getState().tabs[0].subtabs[0];
    expect(subtab.results?.items).toEqual([{ a: 1 }, { b: 2 }, { c: 3 }]);
    expect(subtab.results?.count).toBe(3);
    expect(subtab.results?.requestCharge).toBe(6.5);
    expect(subtab.results?.continuationToken).toBeNull();
  });

  it("initializes table columns from the first result and preserves choices", () => {
    const { openTab, applyQueryResult } = useTabStore.getState();
    openTab("db1", "c1");
    const id = useTabStore.getState().tabs[0].activeSubtabId;

    applyQueryResult(
      id,
      page([{ name: "One", id: "1", status: "active" }], "next", 1),
      "replace",
    );
    expect(useTabStore.getState().tabs[0].subtabs[0].resultColumns).toEqual([
      "id",
      "name",
    ]);

    useTabStore.getState().setResultColumns(id, ["status"]);
    applyQueryResult(
      id,
      page([{ id: "2", category: "new" }], null, 1),
      "replace",
    );
    expect(useTabStore.getState().tabs[0].subtabs[0].resultColumns).toEqual([
      "status",
    ]);
  });

  it("retains an empty page continuation token so a later page can load", () => {
    const { openTab, applyQueryResult } = useTabStore.getState();
    openTab("db1", "c1");
    const id = useTabStore.getState().tabs[0].activeSubtabId;

    applyQueryResult(id, page([], "tok1", 2), "replace");
    let subtab = useTabStore.getState().tabs[0].subtabs[0];
    expect(subtab.results).toMatchObject({
      items: [],
      count: 0,
      continuationToken: "tok1",
    });

    applyQueryResult(id, page([{ id: "found" }], null, 3), "append");
    subtab = useTabStore.getState().tabs[0].subtabs[0];
    expect(subtab.results).toMatchObject({
      items: [{ id: "found" }],
      count: 1,
      requestCharge: 5,
      continuationToken: null,
    });
  });

  it("setTabError clears loading and records the error", () => {
    const { openTab, setTabLoading, setTabError } = useTabStore.getState();
    openTab("db1", "c1");
    const id = useTabStore.getState().tabs[0].activeSubtabId;

    setTabLoading(id, true);
    setTabError(id, { message: "boom", code: 400 });
    const subtab = useTabStore.getState().tabs[0].subtabs[0];
    expect(subtab.isLoading).toBe(false);
    expect(subtab.error).toEqual({ message: "boom", code: 400 });
  });

  it("hydrate loads persisted tabs with empty transient state", () => {
    useTabStore.getState().hydrate({
      tabs: [
        {
          id: makeTabId("db1", "c1"),
          databaseId: "db1",
          containerId: "c1",
          label: "db1 / c1",
          subtabs: [
            {
              id: "query-1",
              name: "Lookup",
              query: "SELECT * FROM c WHERE c.id = 1",
              resultDisplayMode: "table",
              resultColumns: ["id", "name"],
            },
          ],
          activeSubtabId: "query-1",
        },
      ],
      panes: [
        {
          id: "pane-1",
          tabIds: [makeTabId("db1", "c1")],
          activeTabId: makeTabId("db1", "c1"),
          width: 1,
        },
      ],
      activePaneId: "pane-1",
    });

    const { tabs, panes, hydrated } = useTabStore.getState();
    expect(hydrated).toBe(true);
    expect(tabs).toHaveLength(1);
    expect(tabs[0].subtabs[0].query).toBe("SELECT * FROM c WHERE c.id = 1");
    expect(tabs[0].subtabs[0].resultDisplayMode).toBe("table");
    expect(tabs[0].subtabs[0].resultColumns).toEqual(["id", "name"]);
    expect(tabs[0].subtabs[0].results).toBeNull();
    expect(tabs[0].subtabs[0].error).toBeNull();
    expect(tabs[0].subtabs[0].isLoading).toBe(false);
    expect(panes[0].activeTabId).toBe(makeTabId("db1", "c1"));
  });

  it("hydrate prunes cached selections for subtabs no longer in the session", () => {
    useSelectedResultStore.getState().setSelection("query-1", "id:1");
    useSelectedResultStore.getState().setSelection("stale-subtab", "id:2");

    useTabStore.getState().hydrate({
      tabs: [
        {
          id: makeTabId("db1", "c1"),
          databaseId: "db1",
          containerId: "c1",
          label: "db1 / c1",
          subtabs: [
            {
              id: "query-1",
              name: "Lookup",
              query: "SELECT * FROM c WHERE c.id = 1",
              resultDisplayMode: "table",
              resultColumns: ["id", "name"],
            },
          ],
          activeSubtabId: "query-1",
        },
      ],
      panes: [
        {
          id: "pane-1",
          tabIds: [makeTabId("db1", "c1")],
          activeTabId: makeTabId("db1", "c1"),
          width: 1,
        },
      ],
      activePaneId: "pane-1",
    });

    expect(useSelectedResultStore.getState().selections).toEqual({
      "query-1": "id:1",
    });
  });

  it("adds, renames, isolates, and closes subtabs", () => {
    const store = useTabStore.getState();
    store.openTab("db1", "c1");
    const tabId = makeTabId("db1", "c1");
    const firstSubtabId = useTabStore.getState().tabs[0].activeSubtabId;

    useTabStore.getState().addSubtab(tabId);
    let tab = useTabStore.getState().tabs[0];
    const secondSubtabId = tab.activeSubtabId;
    expect(tab.subtabs).toHaveLength(2);
    expect(tab.subtabs[1].name).toBe("Query 2");
    expect(
      useTabStore.getState().renameSubtab(tabId, secondSubtabId, "  Orders  "),
    ).toBe(true);
    useTabStore.getState().updateQuery(secondSubtabId, "SELECT * FROM orders");
    expect(tab.subtabs[0].query).toBe("SELECT * FROM c");
    useTabStore.getState().setResultDisplayMode(firstSubtabId, "table");
    useTabStore.getState().setResultColumns(firstSubtabId, ["id", "name"]);
    tab = useTabStore.getState().tabs[0];
    expect(tab.subtabs[0]).toMatchObject({
      resultDisplayMode: "table",
      resultColumns: ["id", "name"],
    });
    expect(tab.subtabs[1]).toMatchObject({
      resultDisplayMode: "json",
      resultColumns: [],
    });

    useTabStore.getState().closeSubtab(tabId, secondSubtabId);
    tab = useTabStore.getState().tabs[0];
    expect(tab.subtabs).toHaveLength(1);
    expect(tab.activeSubtabId).toBe(firstSubtabId);
    useTabStore.getState().closeSubtab(tabId, firstSubtabId);
    expect(useTabStore.getState().tabs[0].subtabs).toHaveLength(1);
  });

  it("closeSubtab clears the cached selection for the removed subtab only", () => {
    const store = useTabStore.getState();
    store.openTab("db1", "c1");
    const tabId = makeTabId("db1", "c1");
    const firstSubtabId = useTabStore.getState().tabs[0].activeSubtabId;
    store.addSubtab(tabId);
    const secondSubtabId = useTabStore.getState().tabs[0].activeSubtabId;

    const { setSelection } = useSelectedResultStore.getState();
    setSelection(firstSubtabId, "id:1");
    setSelection(secondSubtabId, "id:2");

    useTabStore.getState().closeSubtab(tabId, secondSubtabId);

    expect(useSelectedResultStore.getState().selections).toEqual({
      [firstSubtabId]: "id:1",
    });

    // A tab's last remaining subtab can't be closed, so its selection stays cached.
    useTabStore.getState().closeSubtab(tabId, firstSubtabId);
    expect(useSelectedResultStore.getState().selections).toEqual({
      [firstSubtabId]: "id:1",
    });
  });

  it("splits, moves, and removes parent-tab panes", () => {
    const store = useTabStore.getState();
    store.openTab("db1", "c1");
    store.openTab("db1", "c2");
    store.openTab("db1", "c3");

    store.splitTab(makeTabId("db1", "c2"), "right");
    let state = useTabStore.getState();
    expect(state.panes).toHaveLength(2);
    expect(state.panes[1].tabIds).toEqual([makeTabId("db1", "c2")]);

    state.splitTab(makeTabId("db1", "c3"), "left");
    state = useTabStore.getState();
    expect(state.panes).toHaveLength(MAX_PANES);
    expect(state.panes[0].tabIds).toEqual([makeTabId("db1", "c3")]);

    state.splitTab(makeTabId("db1", "c1"), "right");
    expect(useTabStore.getState().panes).toHaveLength(MAX_PANES);

    const firstPaneId = useTabStore.getState().panes[0].id;
    state.moveTab(makeTabId("db1", "c2"), firstPaneId, 0);
    state = useTabStore.getState();
    expect(state.panes).toHaveLength(2);
    expect(state.panes[0].tabIds[0]).toBe(makeTabId("db1", "c2"));
    expect(state.panes.reduce((sum, pane) => sum + pane.width, 0)).toBeCloseTo(
      1,
    );
  });

  it("serializes durable subtab and pane state without query results", () => {
    useTabStore.getState().openTab("db1", "c1");
    const state = useTabStore.getState();
    const subtabId = state.tabs[0].activeSubtabId;
    state.applyQueryResult(
      subtabId,
      page([{ privateValue: "sensitive-result-value" }], "token", 3),
      "replace",
    );
    const current = useTabStore.getState();

    const session = toSession(
      current.tabs,
      current.panes,
      current.activePaneId,
    );

    expect(session.tabs[0].subtabs[0]).toEqual({
      id: subtabId,
      name: "Query 1",
      query: "SELECT * FROM c",
      resultDisplayMode: "json",
      resultColumns: ["privateValue"],
    });
    expect(JSON.stringify(session)).not.toContain("sensitive-result-value");
    expect(JSON.stringify(session)).not.toContain("token");
  });
});
