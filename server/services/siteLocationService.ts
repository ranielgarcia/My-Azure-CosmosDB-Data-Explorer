import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createTableService, type TableService } from "./tableStorage.js";
import type {
  SiteLocationEntity,
  StoreDetails,
  StoreSummary,
} from "../types/siteLocation.js";

export const SITE_LOCATION_TABLE = "SiteLocation";
export const ALL_STORES_FILE = "all-stores.json";

/**
 * Keys become file names, so restrict them to a safe allowlist to defend
 * against path traversal (OWASP A01). Azure Table keys can contain many
 * characters, but for cache file names we only accept alphanumerics and a few
 * safe separators.
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
  /** Override the cache directory (tests); defaults to server/data/site-location. */
  cacheDir?: string;
}

export interface RefreshResult {
  count: number;
}

export interface SiteLocationService {
  refreshCache(): Promise<RefreshResult>;
  getStore(partitionKey: string, rowKey: string): Promise<StoreDetails>;
  getAllStores(): Promise<StoreSummary[]>;
}

export function createSiteLocationService(
  options: SiteLocationServiceOptions = {},
): SiteLocationService {
  const table =
    options.tableService ??
    createTableService<SiteLocationEntity>(SITE_LOCATION_TABLE);
  const cacheDir =
    options.cacheDir ?? join(process.cwd(), "server", "data", "site-location");

  // Serialize writes so overlapping saves can't interleave and corrupt files.
  let writeChain: Promise<void> = Promise.resolve();

  function storeFileName(partitionKey: string, rowKey: string): string {
    assertSafeKey(partitionKey, "PartitionKey");
    assertSafeKey(rowKey, "RowKey");
    return `${partitionKey}-${rowKey}.json`;
  }

  /** Write JSON atomically (temp file, then rename), serialized per instance. */
  function writeJson(fileName: string, data: unknown): Promise<void> {
    writeChain = writeChain
      .catch(() => {
        // Ignore a prior write failure so this save still runs.
      })
      .then(async () => {
        await mkdir(cacheDir, { recursive: true });
        const file = join(cacheDir, fileName);
        const tmp = `${file}.${process.pid}.tmp`;
        await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
        await rename(tmp, file);
      });
    return writeChain;
  }

  async function readJson<T>(fileName: string): Promise<T | null> {
    try {
      const raw = await readFile(join(cacheDir, fileName), "utf8");
      return JSON.parse(raw) as T;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  function parseDetails(entity: SiteLocationEntity): StoreDetails {
    return JSON.parse(entity.Details) as StoreDetails;
  }

  return {
    async refreshCache() {
      const entities = await table.listEntities();
      const summaries: StoreSummary[] = [];

      for (const entity of entities) {
        const details = parseDetails(entity);
        await writeJson(
          storeFileName(entity.partitionKey, entity.rowKey),
          details,
        );
        summaries.push({
          StoreId: details.StoreId,
          StoreName: details.StoreName,
        });
      }

      await writeJson(ALL_STORES_FILE, summaries);
      return { count: summaries.length };
    },

    async getStore(partitionKey, rowKey) {
      const fileName = storeFileName(partitionKey, rowKey);

      // Cache-first.
      const cached = await readJson<StoreDetails>(fileName);
      if (cached) return cached;

      // Lazy fallback: fetch the entity live, cache it, then return.
      let entity: SiteLocationEntity;
      try {
        entity = await table.getEntity(partitionKey, rowKey);
      } catch (err) {
        if (isNotFound(err)) throw new StoreNotFoundError(partitionKey, rowKey);
        throw err;
      }
      const details = parseDetails(entity);
      await writeJson(fileName, details);
      return details;
    },

    async getAllStores() {
      const cached = await readJson<StoreSummary[]>(ALL_STORES_FILE);
      if (cached) return cached;

      // Auto-build the summary on first access.
      await this.refreshCache();
      return (await readJson<StoreSummary[]>(ALL_STORES_FILE)) ?? [];
    },
  };
}
