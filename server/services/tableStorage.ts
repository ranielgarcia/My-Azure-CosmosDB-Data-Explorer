import type {
  GetTableEntityResponse,
  TableEntityResult,
} from "@azure/data-tables";
import { getTableClient } from "../tableClient.js";

/**
 * A generic, table-name agnostic read layer over Azure Table Storage.
 *
 * `createTableService(tableName)` returns strongly-typed helpers for a single
 * table. Specific services (e.g. SiteLocation) build on top of this to add
 * their own parsing / caching without re-implementing SDK plumbing.
 */
export interface TableService<T extends object> {
  /** Read a single entity by its partition + row key. */
  getEntity(
    partitionKey: string,
    rowKey: string,
  ): Promise<GetTableEntityResponse<TableEntityResult<T>>>;
  /** Iterate every entity in the table, materialised into an array. */
  listEntities(): Promise<TableEntityResult<T>[]>;
}

export function createTableService<T extends object>(
  tableName: string,
): TableService<T> {
  const client = getTableClient(tableName);

  return {
    getEntity(partitionKey, rowKey) {
      return client.getEntity<T>(partitionKey, rowKey);
    },

    async listEntities() {
      const results: TableEntityResult<T>[] = [];
      for await (const entity of client.listEntities<T>()) {
        results.push(entity);
      }
      return results;
    },
  };
}
