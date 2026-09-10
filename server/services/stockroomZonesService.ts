import { createTableService, type TableService } from "./tableStorage.js";
import type { StockroomZoneEntity } from "../types/stockroomZones.js";

export const STOCKROOM_ZONES_TABLE = "StockroomZones";

const STORE_ID = /^\d+$/;
const GUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class InvalidStockroomZoneLookupError extends Error {
  code = 400;

  constructor(which: string) {
    super(`Invalid ${which}.`);
    this.name = "InvalidStockroomZoneLookupError";
  }
}

export interface StockroomZonesServiceOptions {
  tableService?: TableService<StockroomZoneEntity>;
}

export interface StockroomZonesService {
  getByPartitionKeys(partitionKeys: string[]): Promise<StockroomZoneEntity[]>;
  getByIds(ids: string[]): Promise<StockroomZoneEntity[]>;
}

function buildOrFilter(
  property: "PartitionKey" | "Id",
  values: string[],
): string {
  return `(${values.map((value) => `${property} eq '${value}'`).join(" or ")}) and IsDeleted eq false`;
}

function assertValues(
  values: string[],
  expression: RegExp,
  which: string,
): string[] {
  if (!values.every((value) => expression.test(value))) {
    throw new InvalidStockroomZoneLookupError(which);
  }
  return [...new Set(values)];
}

function activeOnly(entities: StockroomZoneEntity[]): StockroomZoneEntity[] {
  return entities.filter((entity) => entity.IsDeleted === false);
}

export function createStockroomZonesService(
  options: StockroomZonesServiceOptions = {},
): StockroomZonesService {
  const table =
    options.tableService ??
    createTableService<StockroomZoneEntity>(STOCKROOM_ZONES_TABLE);

  return {
    async getByPartitionKeys(partitionKeys) {
      if (partitionKeys.length === 0) return [];
      const storeIds = assertValues(partitionKeys, STORE_ID, "PartitionKey");
      return activeOnly(
        await table.listEntitiesByFilter(
          buildOrFilter("PartitionKey", storeIds),
        ),
      );
    },

    async getByIds(ids) {
      if (ids.length === 0) return [];
      const zoneIds = assertValues(ids, GUID, "Id");
      return activeOnly(
        await table.listEntitiesByFilter(buildOrFilter("Id", zoneIds)),
      );
    },
  };
}
