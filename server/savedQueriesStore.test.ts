import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDbForTests, getDb } from "./db/connection.js";
import {
  addQuery,
  deleteQuery,
  listQueries,
  parseNewQuery,
} from "./savedQueriesStore.js";

let dir: string;

describe("savedQueriesStore", () => {
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "saved-queries-store-"));
    process.env.SQLITE_DB_FILE = join(dir, "app.db");
    await resetDbForTests();
  });

  afterEach(async () => {
    await resetDbForTests();
    delete process.env.SQLITE_DB_FILE;
    await rm(dir, { recursive: true, force: true });
  });

  it("returns an empty list when the file is missing", async () => {
    expect(await listQueries("db1", "c1")).toEqual([]);
  });

  it("persists and lists a saved query for its container", async () => {
    const saved = await addQuery({
      databaseId: "db1",
      containerId: "c1",
      name: "All docs",
      query: "SELECT * FROM c",
    });

    expect(saved.id).toBeTruthy();
    expect(saved.createdAt).toBeTruthy();

    const list = await listQueries("db1", "c1");
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      name: "All docs",
      query: "SELECT * FROM c",
      databaseId: "db1",
      containerId: "c1",
    });
  });

  it("only lists queries for the requested database/container", async () => {
    await addQuery({
      databaseId: "db1",
      containerId: "c1",
      name: "One",
      query: "SELECT 1",
    });
    await addQuery({
      databaseId: "db1",
      containerId: "c2",
      name: "Two",
      query: "SELECT 2",
    });
    await addQuery({
      databaseId: "db2",
      containerId: "c1",
      name: "Three",
      query: "SELECT 3",
    });

    const list = await listQueries("db1", "c1");
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("One");
  });

  it("returns queries newest first", async () => {
    const first = await addQuery({
      databaseId: "db1",
      containerId: "c1",
      name: "First",
      query: "SELECT 1",
    });
    // Force a later timestamp than the first record.
    const later = new Date(Date.parse(first.createdAt) + 1000).toISOString();
    const second = await addQuery({
      databaseId: "db1",
      containerId: "c1",
      name: "Second",
      query: "SELECT 2",
    });
    // Guard against equal-millisecond timestamps in fast runs.
    if (second.createdAt <= first.createdAt) {
      const db = await getDb();
      db.prepare("UPDATE saved_queries SET created_at = ? WHERE id = ?").run(
        later,
        second.id,
      );
    }

    const list = await listQueries("db1", "c1");
    expect(list.map((q) => q.name)).toEqual(["Second", "First"]);
  });

  it("deletes a saved query by id", async () => {
    const saved = await addQuery({
      databaseId: "db1",
      containerId: "c1",
      name: "Doomed",
      query: "SELECT * FROM c",
    });

    expect(await deleteQuery(saved.id)).toBe(true);
    expect(await listQueries("db1", "c1")).toEqual([]);
    // Deleting a missing id is a no-op.
    expect(await deleteQuery(saved.id)).toBe(false);
  });

  it("validates and trims create payloads", () => {
    expect(
      parseNewQuery({
        databaseId: " db1 ",
        containerId: " c1 ",
        name: "  My query  ",
        query: "  SELECT * FROM c  ",
      }),
    ).toEqual({
      databaseId: "db1",
      containerId: "c1",
      name: "My query",
      query: "SELECT * FROM c",
    });
  });

  it("rejects malformed or empty payloads", () => {
    expect(parseNewQuery(null)).toBeNull();
    expect(parseNewQuery({ databaseId: "db1" })).toBeNull();
    expect(
      parseNewQuery({
        databaseId: "db1",
        containerId: "c1",
        name: "  ",
        query: "SELECT 1",
      }),
    ).toBeNull();
    expect(
      parseNewQuery({
        databaseId: "db1",
        containerId: "c1",
        name: "ok",
        query: "   ",
      }),
    ).toBeNull();
  });
});
