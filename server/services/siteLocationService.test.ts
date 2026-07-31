import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALL_STORES_FILE,
  createSiteLocationService,
} from "./siteLocationService.js";
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

let dir: string;

function makeTableService(
  entities: TableEntity[],
): TableService<SiteLocationEntity> {
  const byKey = new Map(
    entities.map((e) => [`${e.partitionKey}/${e.rowKey}`, e]),
  );
  return {
    listEntities: vi.fn(async () => entities),
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
    dir = await mkdtemp(join(tmpdir(), "site-location-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("refreshCache writes a per-store file plus all-stores.json", async () => {
    const tableService = makeTableService([
      buildEntity("WA", "0205", "0205", "Coles Karrinyup"),
      buildEntity("VIC", "0311", "0311", "Coles Chadstone"),
    ]);
    const service = createSiteLocationService({ tableService, cacheDir: dir });

    const result = await service.refreshCache();
    expect(result).toEqual({ count: 2 });

    const store = JSON.parse(await readFile(join(dir, "WA-0205.json"), "utf8"));
    expect(store.StoreName).toBe("Coles Karrinyup");

    const all = JSON.parse(await readFile(join(dir, ALL_STORES_FILE), "utf8"));
    expect(all).toEqual([
      { StoreId: "0205", StoreName: "Coles Karrinyup" },
      { StoreId: "0311", StoreName: "Coles Chadstone" },
    ]);
  });

  it("getStore serves from cache without hitting the table", async () => {
    const tableService = makeTableService([]);
    await writeFile(
      join(dir, "WA-0205.json"),
      JSON.stringify({ StoreId: "0205", StoreName: "Cached" }),
      "utf8",
    );
    const service = createSiteLocationService({ tableService, cacheDir: dir });

    const details = await service.getStore("WA", "0205");
    expect(details.StoreName).toBe("Cached");
    expect(tableService.getEntity).not.toHaveBeenCalled();
  });

  it("getStore falls back to the table on a cache miss and writes the file", async () => {
    const tableService = makeTableService([
      buildEntity("WA", "0205", "0205", "Coles Karrinyup"),
    ]);
    const service = createSiteLocationService({ tableService, cacheDir: dir });

    const details = await service.getStore("WA", "0205");
    expect(details.StoreName).toBe("Coles Karrinyup");
    expect(tableService.getEntity).toHaveBeenCalledOnce();

    const written = JSON.parse(
      await readFile(join(dir, "WA-0205.json"), "utf8"),
    );
    expect(written.StoreId).toBe("0205");
  });

  it("getStore throws a 404 error when the entity does not exist", async () => {
    const tableService = makeTableService([]);
    const service = createSiteLocationService({ tableService, cacheDir: dir });

    await expect(service.getStore("WA", "9999")).rejects.toMatchObject({
      code: 404,
    });
  });

  it("getAllStores auto-builds the summary when it is missing", async () => {
    const tableService = makeTableService([
      buildEntity("WA", "0205", "0205", "Coles Karrinyup"),
    ]);
    const service = createSiteLocationService({ tableService, cacheDir: dir });

    const stores = await service.getAllStores();
    expect(stores).toEqual([{ StoreId: "0205", StoreName: "Coles Karrinyup" }]);
  });

  it("rejects keys containing path traversal characters", async () => {
    const tableService = makeTableService([]);
    const service = createSiteLocationService({ tableService, cacheDir: dir });

    await expect(service.getStore("..", "etc")).rejects.toMatchObject({
      code: 400,
    });
    await expect(service.getStore("WA", "../../secret")).rejects.toMatchObject({
      code: 400,
    });
  });
});
