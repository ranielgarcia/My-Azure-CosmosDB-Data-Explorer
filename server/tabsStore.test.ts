import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSession, parseSession, saveSession } from "./tabsStore.js";

let dir: string;

describe("tabsStore", () => {
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "tabs-store-"));
    process.env.TABS_DATA_FILE = join(dir, "tabs.json");
  });

  afterEach(async () => {
    delete process.env.TABS_DATA_FILE;
    await rm(dir, { recursive: true, force: true });
  });

  it("returns an empty session when the file is missing", async () => {
    expect(await getSession()).toEqual({ tabs: [], activeTabId: null });
  });

  it("round-trips a saved session", async () => {
    const session = {
      tabs: [
        {
          id: "db1__c1",
          databaseId: "db1",
          containerId: "c1",
          label: "db1 / c1",
          query: "SELECT * FROM c",
        },
      ],
      activeTabId: "db1__c1",
    };

    await saveSession(session);
    expect(await getSession()).toEqual(session);
  });

  it("writes the file atomically without leaving a temp file", async () => {
    await saveSession({ tabs: [], activeTabId: null });

    const raw = await readFile(process.env.TABS_DATA_FILE!, "utf8");
    expect(JSON.parse(raw)).toEqual({ tabs: [], activeTabId: null });
  });

  it("drops an active id that no longer matches a tab", () => {
    const parsed = parseSession({ tabs: [], activeTabId: "missing" });
    expect(parsed).toEqual({ tabs: [], activeTabId: null });
  });

  it("rejects malformed payloads", () => {
    expect(parseSession(null)).toBeNull();
    expect(parseSession({ tabs: "nope", activeTabId: null })).toBeNull();
    expect(parseSession({ tabs: [{ id: "x" }], activeTabId: null })).toBeNull();
  });
});
