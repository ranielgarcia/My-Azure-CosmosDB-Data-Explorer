import { Umzug, type RunnableMigration, type UmzugStorage } from "umzug";
import type Database from "better-sqlite3";
import { logEvent } from "../logging.js";

const migrations: RunnableMigration<Database.Database>[] = [
  {
    name: "0001_init",
    up: async ({ context: db }) => {
      db.exec(`
        CREATE TABLE saved_queries (
          id TEXT PRIMARY KEY,
          database_id TEXT NOT NULL,
          container_id TEXT NOT NULL,
          name TEXT NOT NULL,
          query TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX idx_saved_queries_lookup
          ON saved_queries (database_id, container_id, created_at DESC);

        CREATE TABLE tabs (
          id TEXT PRIMARY KEY,
          database_id TEXT NOT NULL,
          container_id TEXT NOT NULL,
          label TEXT NOT NULL,
          query TEXT NOT NULL,
          position INTEGER NOT NULL
        );

        -- Single-row table: the fixed id=1 row holds the current active tab id.
        CREATE TABLE active_tab (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          tab_id TEXT
        );

        CREATE TABLE site_location_cache (
          partition_key TEXT NOT NULL,
          row_key TEXT NOT NULL,
          store_id TEXT NOT NULL,
          store_name TEXT NOT NULL,
          details_json TEXT NOT NULL,
          cached_at TEXT NOT NULL,
          PRIMARY KEY (partition_key, row_key)
        );
      `);
    },
    down: async ({ context: db }) => {
      db.exec(`
        DROP TABLE IF EXISTS site_location_cache;
        DROP TABLE IF EXISTS active_tab;
        DROP TABLE IF EXISTS tabs;
        DROP TABLE IF EXISTS saved_queries;
      `);
    },
  },
  {
    name: "0002_selected_store",
    up: async ({ context: db }) => {
      db.exec(`
        -- Single-row table: the fixed id=1 row holds the currently selected store id.
        CREATE TABLE selected_store (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          store_id TEXT
        );
      `);
    },
    down: async ({ context: db }) => {
      db.exec(`
        DROP TABLE IF EXISTS selected_store;
      `);
    },
  },
  {
    name: "0003_subtabs_and_panes",
    up: async ({ context: db }) => {
      db.exec(`
        ALTER TABLE tabs RENAME TO legacy_tabs;

        CREATE TABLE tabs (
          id TEXT PRIMARY KEY,
          database_id TEXT NOT NULL,
          container_id TEXT NOT NULL,
          label TEXT NOT NULL,
          active_subtab_id TEXT NOT NULL
        );

        CREATE TABLE subtabs (
          id TEXT PRIMARY KEY,
          tab_id TEXT NOT NULL REFERENCES tabs(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          query TEXT NOT NULL,
          position INTEGER NOT NULL,
          UNIQUE (tab_id, position)
        );
        CREATE INDEX idx_subtabs_tab ON subtabs (tab_id, position);

        CREATE TABLE panes (
          id TEXT PRIMARY KEY,
          position INTEGER NOT NULL UNIQUE,
          width REAL NOT NULL CHECK (width > 0),
          active_tab_id TEXT NOT NULL
        );

        CREATE TABLE pane_tabs (
          pane_id TEXT NOT NULL REFERENCES panes(id) ON DELETE CASCADE,
          tab_id TEXT NOT NULL UNIQUE REFERENCES tabs(id) ON DELETE CASCADE,
          position INTEGER NOT NULL,
          PRIMARY KEY (pane_id, tab_id),
          UNIQUE (pane_id, position)
        );

        CREATE TABLE active_pane (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          pane_id TEXT NOT NULL
        );

        INSERT INTO tabs (id, database_id, container_id, label, active_subtab_id)
        SELECT id, database_id, container_id, label, id || '__query-1'
        FROM legacy_tabs;

        INSERT INTO subtabs (id, tab_id, name, query, position)
        SELECT id || '__query-1', id, 'Query 1', query, 0
        FROM legacy_tabs;

        INSERT INTO panes (id, position, width, active_tab_id)
        SELECT 'pane-1', 0, 1.0,
          CASE
            WHEN EXISTS (
              SELECT 1 FROM legacy_tabs
              WHERE id = (SELECT tab_id FROM active_tab WHERE id = 1)
            ) THEN (SELECT tab_id FROM active_tab WHERE id = 1)
            ELSE (SELECT id FROM legacy_tabs ORDER BY position ASC LIMIT 1)
          END
        WHERE EXISTS (SELECT 1 FROM legacy_tabs);

        INSERT INTO pane_tabs (pane_id, tab_id, position)
        SELECT 'pane-1', id, position
        FROM legacy_tabs
        ORDER BY position ASC;

        INSERT INTO active_pane (id, pane_id)
        SELECT 1, 'pane-1'
        WHERE EXISTS (SELECT 1 FROM legacy_tabs);

        DROP TABLE active_tab;
        DROP TABLE legacy_tabs;
      `);
    },
    down: async ({ context: db }) => {
      db.exec(`
        CREATE TABLE legacy_tabs (
          id TEXT PRIMARY KEY,
          database_id TEXT NOT NULL,
          container_id TEXT NOT NULL,
          label TEXT NOT NULL,
          query TEXT NOT NULL,
          position INTEGER NOT NULL
        );

        INSERT INTO legacy_tabs (id, database_id, container_id, label, query, position)
        SELECT t.id, t.database_id, t.container_id, t.label,
          COALESCE(active_subtab.query, first_subtab.query, 'SELECT * FROM c'),
          ROW_NUMBER() OVER (
            ORDER BY p.position ASC, pt.position ASC
          ) - 1
        FROM tabs t
        JOIN pane_tabs pt ON pt.tab_id = t.id
        JOIN panes p ON p.id = pt.pane_id
        LEFT JOIN subtabs active_subtab ON active_subtab.id = t.active_subtab_id
        LEFT JOIN subtabs first_subtab ON first_subtab.id = (
          SELECT id FROM subtabs
          WHERE tab_id = t.id
          ORDER BY position ASC
          LIMIT 1
        )
        ORDER BY p.position ASC, pt.position ASC;

        CREATE TABLE active_tab (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          tab_id TEXT
        );

        INSERT INTO active_tab (id, tab_id)
        SELECT 1, p.active_tab_id
        FROM panes p
        WHERE p.id = (SELECT pane_id FROM active_pane WHERE id = 1);

        DROP TABLE active_pane;
        DROP TABLE pane_tabs;
        DROP TABLE panes;
        DROP TABLE subtabs;
        DROP TABLE tabs;
        ALTER TABLE legacy_tabs RENAME TO tabs;
      `);
    },
  },
  {
    name: "0004_subtab_result_view",
    up: async ({ context: db }) => {
      db.exec(`
        ALTER TABLE subtabs
          ADD COLUMN result_display_mode TEXT NOT NULL DEFAULT 'json'
          CHECK (result_display_mode IN ('json', 'table'));
        ALTER TABLE subtabs
          ADD COLUMN result_columns_json TEXT NOT NULL DEFAULT '[]';
      `);
    },
    down: async ({ context: db }) => {
      db.exec(`
        ALTER TABLE subtabs DROP COLUMN result_columns_json;
        ALTER TABLE subtabs DROP COLUMN result_display_mode;
      `);
    },
  },
];

/** Tracks which migrations have run in a table inside the same SQLite file. */
class SqliteMigrationStorage implements UmzugStorage<Database.Database> {
  constructor(private readonly db: Database.Database) {
    db.exec(
      `CREATE TABLE IF NOT EXISTS migrations (
        name TEXT PRIMARY KEY,
        run_at TEXT NOT NULL
      )`,
    );
  }

  async logMigration({ name }: { name: string }): Promise<void> {
    this.db
      .prepare("INSERT INTO migrations (name, run_at) VALUES (?, ?)")
      .run(name, new Date().toISOString());
  }

  async unlogMigration({ name }: { name: string }): Promise<void> {
    this.db.prepare("DELETE FROM migrations WHERE name = ?").run(name);
  }

  async executed(): Promise<string[]> {
    const rows = this.db
      .prepare("SELECT name FROM migrations ORDER BY run_at ASC")
      .all() as { name: string }[];
    return rows.map((row) => row.name);
  }
}

export interface MigrationSummary {
  executed: string[];
  applied: string[];
}

/** Apply any pending migrations to `db`. Safe to call on every startup. */
export async function runMigrations(
  db: Database.Database,
): Promise<MigrationSummary> {
  const umzug = new Umzug({
    migrations,
    context: db,
    storage: new SqliteMigrationStorage(db),
    logger: undefined,
  });
  const executed = await umzug.executed();
  const pending = await umzug.pending();
  const pendingNames = pending.map((migration) => migration.name);
  logEvent({
    event: "migration_check_completed",
    details: {
      executedMigrations:
        executed.map((migration) => migration.name).join(",") || null,
      pendingMigrations: pendingNames.join(",") || null,
    },
  });

  const applied: string[] = [];
  for (const migration of pending) {
    const startedAt = performance.now();
    logEvent({
      event: "migration_started",
      details: { migration: migration.name },
    });
    try {
      await umzug.up({ migrations: [migration.name] });
      applied.push(migration.name);
      logEvent({
        event: "migration_completed",
        details: {
          migration: migration.name,
          durationMs: Math.round(performance.now() - startedAt),
        },
      });
    } catch (error) {
      logEvent({
        event: "migration_failed",
        level: "error",
        details: {
          migration: migration.name,
          durationMs: Math.round(performance.now() - startedAt),
          message: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  return { executed: executed.map((migration) => migration.name), applied };
}
