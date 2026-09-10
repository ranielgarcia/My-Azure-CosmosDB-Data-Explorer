import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDbForTests } from "./db/connection.js";
import {
  getSelectedStoreId,
  parseSelectedStoreId,
  saveSelectedStoreId,
} from "./selectedStoreStore.js";

let dir: string;

describe("selectedStoreStore", () => {
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "selected-store-"));
    process.env.SQLITE_DB_FILE = join(dir, "app.db");
    await resetDbForTests();
  });

  afterEach(async () => {
    await resetDbForTests();
    delete process.env.SQLITE_DB_FILE;
    await rm(dir, { recursive: true, force: true });
  });

  it("returns null when no store has been selected", async () => {
    expect(await getSelectedStoreId()).toBeNull();
  });

  it("round-trips a saved store id", async () => {
    await saveSelectedStoreId("0205");
    expect(await getSelectedStoreId()).toBe("0205");
  });

  it("overwrites the previously saved store id", async () => {
    await saveSelectedStoreId("0205");
    await saveSelectedStoreId("0219");
    expect(await getSelectedStoreId()).toBe("0219");
  });

  it("clears the selection when saved with null", async () => {
    await saveSelectedStoreId("0205");
    await saveSelectedStoreId(null);
    expect(await getSelectedStoreId()).toBeNull();
  });

  describe("parseSelectedStoreId", () => {
    it("accepts a valid store id", () => {
      expect(parseSelectedStoreId({ storeId: "0205" })).toBe("0205");
    });

    it("accepts an explicit null", () => {
      expect(parseSelectedStoreId({ storeId: null })).toBeNull();
    });

    it("rejects a missing storeId field", () => {
      expect(parseSelectedStoreId({})).toBeUndefined();
    });

    it("rejects a non-object payload", () => {
      expect(parseSelectedStoreId("0205")).toBeUndefined();
    });

    it("rejects an empty string", () => {
      expect(parseSelectedStoreId({ storeId: "" })).toBeUndefined();
    });
  });
});
