import type Database from "better-sqlite3";
import { getDb } from "../db/connection.js";
import { createTableService, type TableService } from "./tableStorage.js";
import type {
  SiteLocationEntity,
  StoreDetails,
  StoreSummary,
} from "../types/siteLocation.js";

export const SITE_LOCATION_TABLE = "SiteLocation";

/**
 * Defensive input validation on Table Storage keys (OWASP A01-style hygiene),
 * even though they're only used as parameterized SQL values, not file names.
 */
const SAFE_KEY = /^[A-Za-z0-9._-]+$/;

export class InvalidKeyError extends Error {
  code = 400;
  constructor(which: string) {
    super(
      `Invalid ${which}: only letters, digits, '.', '_' and '-' are allowed.`,
    );
    this.name = "InvalidKeyError";
  }
}

export class StoreNotFoundError extends Error {
  code = 404;
  constructor(partitionKey: string, rowKey: string) {
    super(
      `No store found for PartitionKey '${partitionKey}' / RowKey '${rowKey}'.`,
    );
    this.name = "StoreNotFoundError";
  }
}

function isNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    (err as { statusCode: unknown }).statusCode === 404
  );
}

function assertSafeKey(value: string, which: string): void {
  if (!SAFE_KEY.test(value) || value === "." || value === "..") {
    throw new InvalidKeyError(which);
  }
}

export interface SiteLocationServiceOptions {
  /** Inject a table service (tests); defaults to the real SiteLocation table. */
  tableService?: TableService<SiteLocationEntity>;
  /** Inject a SQLite connection (tests); defaults to the shared app database. */
  db?: Database.Database;
}

export interface RefreshResult {
  count: number;
}

export interface SiteLocationService {
  refreshCache(): Promise<RefreshResult>;
  getStore(partitionKey: string, rowKey: string): Promise<StoreDetails>;
  getAllStores(): Promise<StoreSummary[]>;
}

interface CacheRow {
  details_json: string;
}

interface SummaryRow {
  store_id: string;
  store_name: string;
}

export function createSiteLocationService(
  options: SiteLocationServiceOptions = {},
): SiteLocationService {
  const table =
    options.tableService ??
    createTableService<SiteLocationEntity>(SITE_LOCATION_TABLE);

  async function resolveDb(): Promise<Database.Database> {
    return options.db ?? (await getDb());
  }

  function parseDetails(entity: SiteLocationEntity): StoreDetails {
    return JSON.parse(entity.Details) as StoreDetails;
  }

  function upsertStore(
    db: Database.Database,
    partitionKey: string,
    rowKey: string,
    details: StoreDetails,
  ): void {
    assertSafeKey(partitionKey, "PartitionKey");
    assertSafeKey(rowKey, "RowKey");
    db.prepare(
      `INSERT INTO site_location_cache
         (partition_key, row_key, store_id, store_name, details_json, cached_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (partition_key, row_key) DO UPDATE SET
         store_id = excluded.store_id,
         store_name = excluded.store_name,
         details_json = excluded.details_json,
         cached_at = excluded.cached_at`,
    ).run(
      partitionKey,
      rowKey,
      details.StoreId,
      details.StoreName,
      JSON.stringify(details),
      new Date().toISOString(),
    );
  }

  return {
    async refreshCache() {
      const db = await resolveDb();
      const entities = await table.listEntities();

      const persist = db.transaction((rows: SiteLocationEntity[]) => {
        for (const entity of rows) {
          const details = parseDetails(entity);
          upsertStore(db, entity.partitionKey, entity.rowKey, details);
        }
      });
      persist(entities);

      const { count } = db
        .prepare("SELECT COUNT(*) AS count FROM site_location_cache")
        .get() as { count: number };
      return { count };
    },

    async getStore(partitionKey, rowKey) {
      assertSafeKey(partitionKey, "PartitionKey");
      assertSafeKey(rowKey, "RowKey");
      const db = await resolveDb();

      // Cache-first.
      const cached = db
        .prepare(
          "SELECT details_json FROM site_location_cache WHERE partition_key = ? AND row_key = ?",
        )
        .get(partitionKey, rowKey) as CacheRow | undefined;
      if (cached) return JSON.parse(cached.details_json) as StoreDetails;

      // Lazy fallback: fetch the entity live, cache it, then return.
      let entity: SiteLocationEntity;
      try {
        entity = await table.getEntity(partitionKey, rowKey);
      } catch (err) {
        if (isNotFound(err)) throw new StoreNotFoundError(partitionKey, rowKey);
        throw err;
      }
      const details = parseDetails(entity);
      upsertStore(db, partitionKey, rowKey, details);
      return details;
    },

    async getAllStores() {
      const db = await resolveDb();
      const rows = db
        .prepare(
          "SELECT store_id, store_name FROM site_location_cache ORDER BY rowid ASC",
        )
        .all() as SummaryRow[];
      if (rows.length > 0) {
        return rows.map((row) => ({
          StoreId: row.store_id,
          StoreName: row.store_name,
        }));
      }

      // Auto-build the cache on first access.
      await this.refreshCache();
      const rebuilt = db
        .prepare(
          "SELECT store_id, store_name FROM site_location_cache ORDER BY rowid ASC",
        )
        .all() as SummaryRow[];
      return rebuilt.map((row) => ({
        StoreId: row.store_id,
        StoreName: row.store_name,
      }));
    },
  };
}
