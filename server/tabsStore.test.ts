import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDbForTests } from "./db/connection.js";
import {
  clearSession,
  getSession,
  parseSession,
  saveSession,
  type TabSession,
} from "./tabsStore.js";

let dir: string;

function createSession(): TabSession {
  return {
    tabs: [
      {
        id: "db1__c1",
        databaseId: "db1",
        containerId: "c1",
        label: "db1 / c1",
        subtabs: [
          {
            id: "query-a",
            name: "Query 1",
            query: "SELECT 1",
            resultDisplayMode: "json",
            resultColumns: [],
          },
          {
            id: "query-b",
            name: "Recent",
            query: "SELECT 2",
            resultDisplayMode: "table",
            resultColumns: ["id", "name"],
          },
        ],
        activeSubtabId: "query-b",
      },
      {
        id: "db1__c2",
        databaseId: "db1",
        containerId: "c2",
        label: "db1 / c2",
        subtabs: [
          {
            id: "query-c",
            name: "Query 1",
            query: "SELECT * FROM c",
            resultDisplayMode: "json",
            resultColumns: [],
          },
        ],
        activeSubtabId: "query-c",
      },
    ],
    panes: [
      {
        id: "pane-left",
        tabIds: ["db1__c1"],
        activeTabId: "db1__c1",
        width: 0.4,
      },
      {
        id: "pane-right",
        tabIds: ["db1__c2"],
        activeTabId: "db1__c2",
        width: 0.6,
      },
    ],
    activePaneId: "pane-right",
  };
}

describe("tabsStore", () => {
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "tabs-store-"));
    process.env.SQLITE_DB_FILE = join(dir, "app.db");
    await resetDbForTests();
  });

  afterEach(async () => {
    await resetDbForTests();
    delete process.env.SQLITE_DB_FILE;
    await rm(dir, { recursive: true, force: true });
  });

  it("returns an empty session when no tabs are persisted", async () => {
    expect(await getSession()).toEqual({
      tabs: [],
      panes: [],
      activePaneId: null,
    });
  });

  it("round-trips subtabs, panes, active selections, order, and widths", async () => {
    const session = createSession();

    await saveSession(session);
    expect(await getSession()).toEqual(session);
  });

  it("preserves tab order across saves", async () => {
    const session = createSession();

    await saveSession(session);
    expect((await getSession()).tabs.map((tab) => tab.id)).toEqual([
      "db1__c1",
      "db1__c2",
    ]);
  });

  it("replaces the previous session on each nonempty save", async () => {
    await saveSession(createSession());
    const replacement = createSession();
    replacement.tabs = replacement.tabs.slice(0, 1);
    replacement.panes = [
      {
        id: "pane-left",
        tabIds: ["db1__c1"],
        activeTabId: "db1__c1",
        width: 1,
      },
    ];
    replacement.activePaneId = "pane-left";
    await saveSession(replacement);

    expect(await getSession()).toEqual(replacement);
  });

  it("requires explicit clear to delete a populated session", async () => {
    await saveSession(createSession());

    expect(
      parseSession({ tabs: [], panes: [], activePaneId: null }),
    ).toBeNull();
    await clearSession();

    expect(await getSession()).toEqual({
      tabs: [],
      panes: [],
      activePaneId: null,
    });
  });

  it("accepts a valid nested session", () => {
    const session = createSession();
    expect(parseSession(session)).toEqual(session);
  });

  it("normalizes legacy subtabs without result view preferences", () => {
    const session = createSession();
    const legacy = structuredClone(session) as unknown as {
      tabs: Array<{ subtabs: Array<Record<string, unknown>> }>;
    };
    delete legacy.tabs[0].subtabs[0].resultDisplayMode;
    delete legacy.tabs[0].subtabs[0].resultColumns;

    expect(parseSession(legacy)?.tabs[0].subtabs[0]).toMatchObject({
      resultDisplayMode: "json",
      resultColumns: [],
    });
  });

  it("rejects malformed result view preferences", () => {
    const session = createSession();
    session.tabs[0].subtabs[0].resultColumns = ["id", "id"];
    expect(parseSession(session)).toBeNull();

    session.tabs[0].subtabs[0].resultColumns = ["id"];
    session.tabs[0].subtabs[0].resultDisplayMode = "grid" as "table";
    expect(parseSession(session)).toBeNull();
  });

  it("rejects invalid nested relationships", () => {
    const session = createSession();
    session.tabs[0].activeSubtabId = "missing";

    expect(parseSession(session)).toBeNull();
  });

  it("rejects a tab assigned to multiple panes", () => {
    const session = createSession();
    session.panes[1].tabIds.push("db1__c1");

    expect(parseSession(session)).toBeNull();
  });

  it("migrates legacy tab queries into active Query 1 subtabs", async () => {
    const file = join(dir, "legacy.db");
    const legacyDb = new Database(file);
    legacyDb.exec(`
      CREATE TABLE migrations (name TEXT PRIMARY KEY, run_at TEXT NOT NULL);
      INSERT INTO migrations (name, run_at) VALUES
        ('0001_init', '2026-01-01T00:00:00.000Z'),
        ('0002_selected_store', '2026-01-02T00:00:00.000Z');
      CREATE TABLE tabs (
        id TEXT PRIMARY KEY,
        database_id TEXT NOT NULL,
        container_id TEXT NOT NULL,
        label TEXT NOT NULL,
        query TEXT NOT NULL,
        position INTEGER NOT NULL
      );
      CREATE TABLE active_tab (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        tab_id TEXT
      );
      CREATE TABLE selected_store (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        store_id TEXT
      );
      INSERT INTO tabs VALUES
        ('db1__c1', 'db1', 'c1', 'db1 / c1', 'SELECT 1', 0),
        ('db1__c2', 'db1', 'c2', 'db1 / c2', 'SELECT 2', 1);
      INSERT INTO active_tab VALUES (1, 'db1__c2');
    `);
    legacyDb.close();
    process.env.SQLITE_DB_FILE = file;
    await resetDbForTests();

    const session = await getSession();

    expect(session.tabs.map((tab) => tab.id)).toEqual(["db1__c1", "db1__c2"]);
    expect(session.tabs.map((tab) => tab.subtabs[0])).toEqual([
      {
        id: "db1__c1__query-1",
        name: "Query 1",
        query: "SELECT 1",
        resultDisplayMode: "json",
        resultColumns: [],
      },
      {
        id: "db1__c2__query-1",
        name: "Query 1",
        query: "SELECT 2",
        resultDisplayMode: "json",
        resultColumns: [],
      },
    ]);
    expect(session.panes).toEqual([
      {
        id: "pane-1",
        tabIds: ["db1__c1", "db1__c2"],
        activeTabId: "db1__c2",
        width: 1,
      },
    ]);
    expect(session.activePaneId).toBe("pane-1");
  });

  it("rejects malformed payloads", () => {
    expect(parseSession(null)).toBeNull();
    expect(
      parseSession({ tabs: "nope", panes: [], activePaneId: null }),
    ).toBeNull();
    expect(
      parseSession({ tabs: [{ id: "x" }], panes: [], activePaneId: null }),
    ).toBeNull();
  });
});
