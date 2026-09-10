# Local Storage → SQLite Migration Plan

## Overview

Replace the three fs/JSON-backed local stores with a single SQLite database
(`better-sqlite3`), schema-managed by `umzug` migrations:

1. [server/savedQueriesStore.ts](../server/savedQueriesStore.ts) — was `server/data/saved-queries.json`
2. [server/tabsStore.ts](../server/tabsStore.ts) — was `server/data/tabs.json`
3. [server/services/siteLocationService.ts](../server/services/siteLocationService.ts) — was
   `server/data/site-location/*.json` (a cache of Azure Table Storage data)

Existing JSON data is **not** migrated — SQLite starts empty. Old JSON files under
`server/data/` (already git-ignored) become dead and can be deleted manually.
Store module function signatures are unchanged, so `server/routes/*.ts` files require
no edits.

## Decisions

- Driver: `better-sqlite3` (synchronous, prepared statements).
- Migration tool: `umzug`, with an **in-code migration list** (not file-glob autoload,
  to avoid ESM/`tsx` dynamic-import edge cases) and a custom `UmzugStorage`
  implementation backed by a `migrations` table in the same database.
- Single DB file: `server/data/app.db`, path overridable via `SQLITE_DB_FILE` env var.
- `tabs.position` is a new column that preserves the list order the old JSON array
  gave implicitly.
- `InvalidKeyError` / `assertSafeKey` in `siteLocationService.ts` are kept as
  defensive input validation (no longer about path traversal, since there are no
  file names anymore, but still a reasonable guard on `partitionKey`/`rowKey`).

## Schema (migration `0001_init`)

- `saved_queries(id, database_id, container_id, name, query, created_at)` +
  index on `(database_id, container_id, created_at desc)`
- `tabs(id, database_id, container_id, label, query, position)`
- `active_tab(id INTEGER PRIMARY KEY CHECK(id=1), tab_id)` — single-row table
  replacing the `activeTabId` field
- `site_location_cache(partition_key, row_key, store_id, store_name, details_json,
cached_at)`, primary key `(partition_key, row_key)`

## Steps

### Phase 0 — Manual pre-work (done)

- `npm install better-sqlite3 umzug`
- `npm install -D @types/better-sqlite3`
- Verified `node -e "require('better-sqlite3')"` loads cleanly.

### Phase 1 — DB layer & migrations

- `server/db/connection.ts` — `getDb()` singleton (opens `SQLITE_DB_FILE`, defaults to
  `server/data/app.db`, sets `journal_mode = WAL` + `foreign_keys = ON`, runs
  migrations on first open); `resetDbForTests()` to close/clear the singleton.
- `server/db/migrations.ts` — migration list + `SqliteStorage` (umzug storage) +
  `runMigrations(db)`.
- `server/index.ts` — call `getDb()` before `app.listen`, fail fast on error.

### Phase 2 — Saved queries

- Rewrite `server/savedQueriesStore.ts` I/O to prepared statements; keep
  `SavedQuery`, `NewSavedQuery`, `parseNewQuery` unchanged.
- Update `server/savedQueriesStore.test.ts` to use `SQLITE_DB_FILE` + `resetDbForTests()`.

### Phase 3 — Tabs session

- Rewrite `server/tabsStore.ts`: `getSession`/`saveSession` use prepared statements
  and a transaction; keep `PersistedTab`, `TabSession`, `parseSession` unchanged.
- Update `server/tabsStore.test.ts` with the same env-var/reset swap.

### Phase 4 — Site location cache

- Rewrite `server/services/siteLocationService.ts`: drop file-cache helpers, add an
  optional injectable `db` for tests; `getAllStores()` keeps its
  auto-build-cache-on-first-read behavior.
- Update `server/services/siteLocationService.test.ts` to inject a `db` instead of a
  `cacheDir`.

### Phase 5 — Cleanup & docs

- Update `.env.example`: replace `SAVED_QUERIES_DATA_FILE` with `SQLITE_DB_FILE`.
- `package.json` already has `better-sqlite3`, `umzug`, `@types/better-sqlite3`.
- Old `server/data/*.json` files may be deleted manually (not required).

## Verification (manual, run by the developer)

1. `npm test`
2. `npm run dev:server`, then check `GET /api/health`, `GET /api/saved-queries?...`,
   `POST /api/saved-queries`, `GET /api/tabs`, `PUT /api/tabs`.
3. Confirm `server/data/app.db` is created on first boot.
4. Optional: `sqlite3 server/data/app.db ".tables"` to inspect the schema.
5. `npm run build` to confirm typings resolve with `@types/better-sqlite3`.

## Out of scope

- Importing existing JSON data into SQLite.
- Prev/Next-style query result changes (unrelated — see
  [implementation-plan.md](implementation-plan.md)).
