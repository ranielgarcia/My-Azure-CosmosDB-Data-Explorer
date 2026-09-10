import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runMigrations } from "../db/migrations.js";
import { createSiteLocationService } from "./siteLocationService.js";
import type { TableService } from "./tableStorage.js";
import type { SiteLocationEntity } from "../types/siteLocation.js";

type TableEntity = SiteLocationEntity & { etag: string };

function buildEntity(
  partitionKey: string,
  rowKey: string,
  storeId: string,
  storeName: string,
): TableEntity {
  return {
    partitionKey,
    rowKey,
    etag: 'W/"0x0"',
    Details: JSON.stringify({
      StoreId: storeId,
      StoreName: storeName,
      IsOpen: true,
      OpeningHours: [],
      OpeningHoursExceptions: [],
      Services: [],
    }),
  };
}

let db: Database.Database;

function makeTableService(
  entities: TableEntity[],
): TableService<SiteLocationEntity> {
  const byKey = new Map(
    entities.map((e) => [`${e.partitionKey}/${e.rowKey}`, e]),
  );
  return {
    listEntities: vi.fn(async () => entities),
    listEntitiesByFilter: vi.fn(async () => entities),
    getEntity: vi.fn(async (partitionKey: string, rowKey: string) => {
      const entity = byKey.get(`${partitionKey}/${rowKey}`);
      if (!entity) {
        const err = new Error("Not Found") as Error & { statusCode: number };
        err.statusCode = 404;
        throw err;
      }
      return entity as never;
    }),
  };
}

describe("siteLocationService", () => {
  beforeEach(async () => {
    db = new Database(":memory:");
    await runMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it("refreshCache caches every store and reports the count", async () => {
    const tableService = makeTableService([
      buildEntity("WA", "0205", "0205", "Test Store North"),
      buildEntity("VIC", "0311", "0311", "Test Store South"),
    ]);
    const service = createSiteLocationService({ tableService, db });

    const result = await service.refreshCache();
    expect(result).toEqual({ count: 2 });

    const store = await service.getStore("WA", "0205");
    expect(store.StoreName).toBe("Test Store North");

    const all = await service.getAllStores();
    expect(all).toEqual([
      { StoreId: "0205", StoreName: "Test Store North" },
      { StoreId: "0311", StoreName: "Test Store South" },
    ]);
  });

  it("getStore serves from cache without hitting the table", async () => {
    const tableService = makeTableService([]);
    db.prepare(
      `INSERT INTO site_location_cache
         (partition_key, row_key, store_id, store_name, details_json, cached_at)
       VALUES ('WA', '0205', '0205', 'Cached', ?, ?)`,
    ).run(
      JSON.stringify({ StoreId: "0205", StoreName: "Cached" }),
      new Date().toISOString(),
    );
    const service = createSiteLocationService({ tableService, db });

    const details = await service.getStore("WA", "0205");
    expect(details.StoreName).toBe("Cached");
    expect(tableService.getEntity).not.toHaveBeenCalled();
  });

  it("getStore falls back to the table on a cache miss and caches the result", async () => {
    const tableService = makeTableService([
      buildEntity("WA", "0205", "0205", "Test Store North"),
    ]);
    const service = createSiteLocationService({ tableService, db });

    const details = await service.getStore("WA", "0205");
    expect(details.StoreName).toBe("Test Store North");
    expect(tableService.getEntity).toHaveBeenCalledOnce();

    const row = db
      .prepare(
        "SELECT store_id FROM site_location_cache WHERE partition_key = ? AND row_key = ?",
      )
      .get("WA", "0205") as { store_id: string };
    expect(row.store_id).toBe("0205");
  });

  it("getStore throws a 404 error when the entity does not exist", async () => {
    const tableService = makeTableService([]);
    const service = createSiteLocationService({ tableService, db });

    await expect(service.getStore("WA", "9999")).rejects.toMatchObject({
      code: 404,
    });
  });

  it("getAllStores auto-builds the cache when it is empty", async () => {
    const tableService = makeTableService([
      buildEntity("WA", "0205", "0205", "Test Store North"),
    ]);
    const service = createSiteLocationService({ tableService, db });

    const stores = await service.getAllStores();
    expect(stores).toEqual([
      { StoreId: "0205", StoreName: "Test Store North" },
    ]);
  });

  it("rejects keys containing path traversal characters", async () => {
    const tableService = makeTableService([]);
    const service = createSiteLocationService({ tableService, db });

    await expect(service.getStore("..", "etc")).rejects.toMatchObject({
      code: 400,
    });
    await expect(service.getStore("WA", "../../secret")).rejects.toMatchObject({
      code: 400,
    });
  });
});
