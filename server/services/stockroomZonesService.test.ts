import { describe, expect, it, vi } from "vitest";
import {
  createStockroomZonesService,
  InvalidStockroomZoneLookupError,
} from "./stockroomZonesService.js";
import type { TableService } from "./tableStorage.js";
import type { StockroomZoneEntity } from "../types/stockroomZones.js";

type TableEntity = StockroomZoneEntity & { etag: string };

function buildEntity(isDeleted: boolean | undefined = false): TableEntity {
  return {
    partitionKey: "1234",
    rowKey: "490fce0d-6df0-4e67-a16b-4b8cc55d9a7d",
    etag: 'W/"0x0"',
    IsDeleted: isDeleted as boolean,
    Id: "490fce0d-6df0-4e67-a16b-4b8cc55d9a7d",
    LastReset: new Date("2026-08-29T00:00:00.000Z"),
    ResetBy: "user@example.com",
    ResetDeviceId: "3456",
    ResetStatus: "Completed",
    Sequence: 1,
    TpcGroup: "Ambient",
    ZoneName: "Zone 1",
  };
}

function makeTableService(
  entities: TableEntity[],
): TableService<StockroomZoneEntity> {
  return {
    getEntity: vi.fn(),
    listEntities: vi.fn(),
    listEntitiesByFilter: vi.fn(async () => entities),
  };
}

describe("stockroomZonesService", () => {
  it("looks up multiple partition keys and excludes non-active rows", async () => {
    const active = buildEntity(false);
    const deleted = buildEntity(true);
    const withoutFlag: Omit<TableEntity, "IsDeleted"> & {
      IsDeleted?: boolean;
    } = buildEntity();
    delete withoutFlag.IsDeleted;
    const tableService = makeTableService([
      active,
      deleted,
      withoutFlag as TableEntity,
    ]);
    const service = createStockroomZonesService({ tableService });

    await expect(service.getByPartitionKeys(["1234", "5678"])).resolves.toEqual(
      [active],
    );
    expect(tableService.listEntitiesByFilter).toHaveBeenCalledWith(
      "(PartitionKey eq '1234' or PartitionKey eq '5678') and IsDeleted eq false",
    );
  });

  it("looks up multiple ids", async () => {
    const tableService = makeTableService([buildEntity()]);
    const service = createStockroomZonesService({ tableService });
    const firstId = "490fce0d-6df0-4e67-a16b-4b8cc55d9a7d";
    const secondId = "9a334505-0559-4cd0-878f-e35b21ba0c49";

    await service.getByIds([firstId, secondId]);
    expect(tableService.listEntitiesByFilter).toHaveBeenCalledWith(
      `(Id eq '${firstId}' or Id eq '${secondId}') and IsDeleted eq false`,
    );
  });

  it("returns an empty result without querying for empty lookups", async () => {
    const tableService = makeTableService([]);
    const service = createStockroomZonesService({ tableService });

    await expect(service.getByPartitionKeys([])).resolves.toEqual([]);
    await expect(service.getByIds([])).resolves.toEqual([]);
    expect(tableService.listEntitiesByFilter).not.toHaveBeenCalled();
  });

  it("rejects invalid store ids and zone ids", async () => {
    const service = createStockroomZonesService({
      tableService: makeTableService([]),
    });

    await expect(service.getByPartitionKeys(["12'34"])).rejects.toBeInstanceOf(
      InvalidStockroomZoneLookupError,
    );
    await expect(service.getByIds(["not-a-guid"])).rejects.toBeInstanceOf(
      InvalidStockroomZoneLookupError,
    );
  });

  it("propagates table storage errors", async () => {
    const tableService = makeTableService([]);
    vi.mocked(tableService.listEntitiesByFilter).mockRejectedValueOnce(
      new Error("Table unavailable"),
    );
    const service = createStockroomZonesService({ tableService });

    await expect(service.getByPartitionKeys(["1234"])).rejects.toThrow(
      "Table unavailable",
    );
  });
});
