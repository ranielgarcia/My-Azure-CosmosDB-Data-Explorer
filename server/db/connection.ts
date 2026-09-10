import { mkdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import Database from "better-sqlite3";
import { logEvent } from "../logging.js";
import { runMigrations } from "./migrations.js";

// Resolved lazily so the path always reflects the current SQLITE_DB_FILE.
function dbFile(): string {
  return (
    process.env.SQLITE_DB_FILE ??
    join(process.cwd(), "server", "data", "app.db")
  );
}

export function resolvedDbFile(): string {
  return resolve(dbFile());
}

// Memoized immediately (before any await) so concurrent callers share one open+migrate.
let dbPromise: Promise<Database.Database> | null = null;

async function openDb(): Promise<Database.Database> {
  const file = resolvedDbFile();
  const startedAt = performance.now();
  let existingFile: { size: number; modifiedAt: string } | null = null;
  try {
    const metadata = await stat(file);
    existingFile = {
      size: metadata.size,
      modifiedAt: metadata.mtime.toISOString(),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  logEvent({
    event: "sqlite_open_started",
    details: {
      databaseFile: file,
      databaseFileExisted: existingFile !== null,
      databaseFileBytes: existingFile?.size ?? 0,
      databaseFileModifiedAt: existingFile?.modifiedAt ?? null,
    },
  });
  await mkdir(dirname(file), { recursive: true });

  try {
    const instance = new Database(file);
    instance.pragma("journal_mode = WAL");
    instance.pragma("foreign_keys = ON");
    const migrations = await runMigrations(instance);
    const counts = instance
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM tabs) AS tabs,
          (SELECT COUNT(*) FROM subtabs) AS subtabs,
          (SELECT COUNT(*) FROM panes) AS panes,
          (SELECT COUNT(*) FROM pane_tabs) AS paneTabs`,
      )
      .get() as {
      tabs: number;
      subtabs: number;
      panes: number;
      paneTabs: number;
    };

    logEvent({
      event: "sqlite_opened",
      details: {
        databaseFile: file,
        durationMs: Math.round(performance.now() - startedAt),
        appliedMigrations: migrations.applied.join(",") || null,
        executedMigrations: migrations.executed.join(",") || null,
        tabs: counts.tabs,
        subtabs: counts.subtabs,
        panes: counts.panes,
        paneTabs: counts.paneTabs,
      },
    });
    return instance;
  } catch (error) {
    logEvent({
      event: "sqlite_open_failed",
      level: "error",
      details: {
        databaseFile: file,
        durationMs: Math.round(performance.now() - startedAt),
        message: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

/** Return the shared SQLite connection, opening it and running migrations on first call. */
export function getDb(): Promise<Database.Database> {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

/** Close and clear the cached connection so the next getDb() re-reads env vars (tests only). */
export async function resetDbForTests(): Promise<void> {
  const promise = dbPromise;
  dbPromise = null;
  if (promise) (await promise).close();
}
