# CosmoScope

A **React + TypeScript** Cosmos DB Data Explorer built for a support team as a faster, safer,
store-aware alternative to the Azure Portal's Data Explorer. It replicates ~90% of the Azure
Portal's Data Explorer with a cleaner, developer-focused UI, and is **read-only by design** — safe
to hand to anyone.

The Azure Cosmos SDK runs only inside a lightweight Express **backend proxy** — credentials never
reach the browser.

---

## Why this exists

The application this tool supports runs stores across Australia, spanning multiple states and
timezones. Cosmos DB stores every timestamp in **UTC**, which makes raw documents hard to reason
about during an investigation — a UTC value gives no immediate sense of "was this during store
hours?" or "what time did this actually happen for that store's team?".

CosmoScope closes that gap:

- **Automatic UTC → store-local time conversion**, so the actual local time at the affected store
  is always visible alongside the raw UTC value, letting support engineers reason about store
  hours/events correctly and communicate accurately with store team members in their own timezone
  (see [Store-aware context](#store-aware-context)).
- **Inline enum decoding**, so raw integer values (e.g. `"documentType": 1`) are annotated with
  their human-readable business meaning directly in the query results, removing the need to
  cross-reference application source code during an investigation (see
  [Enhanced query result experience](#enhanced-query-result-experience)).
- **Store selection as a first-class concept**, so once a support engineer picks the store they're
  investigating, its timezone, operating hours, and stockroom zone data are loaded and applied
  automatically for the rest of the session.

These annotations render directly in the query results (Monaco editor), turning raw Cosmos
documents into something a support engineer can interpret at a glance, without manual timezone
math or digging through code to decode enum values.

> **Local environment only.** This application is designed to run locally, since it relies on the
> Azure CLI credentials associated with your account (or a connection string you supply).

---

## Features

### Store-aware context

Support users select a store once and continue working within that store's context throughout
their investigation. The explorer enriches query results with operational information relevant to
the selected store:

- **Store information and operating hours**, sourced from Azure Table Storage store master data
  (the `SiteLocation` table), cached locally for fast lookups.
- **Automatic timezone conversion**, displaying UTC timestamps in both the selected store's local
  timezone and the user's local timezone, eliminating manual timezone calculations.
- **Stockroom zone visibility**, showing the current status of stockroom zones, last reset
  timestamps, responsible operator, and device information (from the `StockroomZones` table).
- **Persistent store selection**, so the chosen store survives page refreshes and browser
  sessions.

The "selected store" (which store you're currently investigating) and the "site-location" cache
(the store master data itself: timezone, address, hours) are two distinct, independently
persisted layers — see [Architecture](#architecture) for how they fit together.

### Enhanced query result experience

Query results are automatically enhanced with contextual annotations, rendered in-place in the
Monaco JSON viewer without modifying the underlying JSON text:

- **Smart enum decoding** — raw numeric values (e.g. `"documentType": 1`) are annotated inline
  with their human-readable business label, while the original value is preserved and a hover
  tooltip shows the full enum list with the current value highlighted. Enums are configured
  per-container (e.g. `documentType` for the stockroom container).
- **Human-readable timestamps** — UTC ISO datetime strings are annotated with both the selected
  store's local time (using its IANA timezone, e.g. `Australia/Perth`) and the browser's local
  time, displayed alongside the raw value.

These enhancements significantly reduce the effort required to interpret Cosmos DB documents,
enabling faster root-cause analysis without cross-referencing application code or doing manual
timezone math.

### Database & container tree

Collapsible database → container tree in the left panel, with partition-key tooltips. Clicking a
container opens (or activates) a query tab — no duplicate tabs. The **Refresh** button reloads the
whole database tree and the Table Storage store cache in one click.

### Monaco SQL editor

A full [Monaco](https://microsoft.github.io/monaco-editor/) editor instance with Cosmos SQL support:

- **Cosmos SQL syntax highlighting** — keywords, built-in functions (`IS_NULL`, `ARRAY_LENGTH`,
  `CONTAINS`, etc.) highlighted via a custom Monarch grammar.
- **IntelliSense / autocomplete** — keyword and function completions (with `$0` snippet placeholders)
  plus **field completions derived from actual result data**: `c.` expands to top-level fields;
  `c.address.` expands to nested children (max depth 6, alias-dot-aware).
- **Execute selected text** — highlight part of the query and press **Execute** / **Ctrl/⌘ + Enter**
  to run only that fragment (or the whole query with nothing selected).
- **Cursor position** displayed (line : column) in the editor toolbar.
- **Resizable editor pane** — drag the handle below the editor; height is persisted to
  `localStorage`.
- Light (`cosmos-light`) and dark (`cosmos-dark`) editor themes that follow the app theme.
- Default `SELECT * FROM c` template on new tabs/subtabs.

### Read-only enforcement

Mutating statements are rejected at the proxy layer before they reach Cosmos (see
[Read-only safety](#read-only-safety-mutation-queries-are-blocked) below).

### Paginated results

Results load **100 items per page** (`maxItemCount`), with the proxy transparently following
Cosmos continuation tokens internally to fill each page.

- **Load more** appends the next page (infinite-scroll style) and accumulates the total RU charge.
- The button disappears once all pages are loaded (`continuationToken` is `null`).
- Re-running a query resets the accumulated items and token.

### JSON & table results

- **JSON view** — pretty-printed, syntax-highlighted (`highlight.js`), foldable, with a
  **copy-to-clipboard** button. UTC ISO datetime strings are **annotated in-place** with both the
  selected store's local time (using its IANA timezone, e.g. `Australia/Perth`) and the browser's
  local time — without modifying the underlying JSON text.
- **Table view** — configurable columns; click a row to see the full JSON detail.
- **Status bar** — per-tab display of running item count, cumulative Request Units (RU), and load
  state.
- Clear loading/empty/error states throughout; connection and tree-load failures appear in the
  left panel with a retry option, and per-query errors show an in-tab banner with the message and
  HTTP status code.

### Tabs, subtabs & split-pane layout

- **Multiple tabs**, each with **multiple named subtabs** for running variations of a query
  against the same container (double-click a subtab to rename it). Re-opening the same container
  activates the existing tab instead of creating a duplicate.
- **Up to 3 side-by-side panes** — drag a tab to the left/right edge of the window to split the
  view, and resize panes freely.
- **Drag-and-drop tab reordering** within and across panes.
- **Full session persistence** — tab/subtab structure, query text, pane layout, and result column
  widths are saved to SQLite and restored after a restart (debounced auto-save, ~1 s).
- Fully resizable, collapsible left/right sidebars and editor pane, with keyboard support (arrow
  keys, Home-to-reset).

### Saved queries

A **right panel** (`Saved Queries`) scoped per database + container:

- Lists saved queries for the active container tab.
- Click a saved query to load it into the editor instantly.
- Trash icon to delete.
- Queries are saved server-side in SQLite (UUID, name <= 120 chars, query <= 100 KB, newest-first).

### Azure Table Storage — Store Details

An optional **Store Details** panel in the bottom half of the left sidebar integrates with an
Azure Table Storage `SiteLocation` table:

- **Store select** dropdown populated from a local SQLite cache.
- **Store Details card** — displays store name, ID, timezone, address, and opening hours schedule.
- **Stockroom reset info** — current status of each stockroom zone, last reset timestamp,
  responsible operator, and device ID (from the `StockroomZones` table).
- The selected store's **IANA timezone** is shared globally and used by the JSON viewer to
  annotate UTC datetime values with local times.
- Cache is rebuilt on demand via the **Refresh** button or `POST /api/tables/site-location/refresh`.
- Lazy initialisation — the proxy starts normally when Table Storage env vars are absent.

### Light / Dark / System theme

Three-way theme toggle (`light` | `dark` | `system`) in the left panel header:

- **Default follows OS** (`prefers-color-scheme`).
- Selected theme persists to `localStorage` (`cosmos-theme`).
- An inline `<script>` in `index.html` sets the `html.dark` class before first paint — **no flash
  of unstyled content**.
- The Monaco editor and `highlight.js` token colours update in sync with the theme.
- Offline-bundled Inter + JetBrains Mono fonts — no external font requests.
- Keyboard-accessible resize handles and drag-and-drop (ARIA-labeled).

### Resizable layout

All four panel dimensions are individually draggable and **persisted to `localStorage`**:

| Panel               | `localStorage` key            | Default | Range                     |
| ------------------- | ------------------------------ | ------- | ------------------------- |
| Left sidebar width  | `cosmos-sidebar-width`         | 256 px  | 200 – 560 px              |
| Store panel height  | `cosmos-store-panel-height`    | 280 px  | 120 px – (aside − 120 px) |
| Query editor height | `cosmos-query-editor-height`   | 160 px  | 80 px – (panel − 80 px)   |
| Right sidebar width | `cosmos-right-sidebar-width`   | 288 px  | 220 – 560 px              |

Double-click (or **Home** key) on any resize handle resets that dimension to its default. Arrow
keys nudge the handle by 1 px.

---

## Read-only safety (mutation queries are blocked)

This tool is intentionally **read-only**. The Express proxy rejects any query whose text — after
trimming whitespace and stripping leading SQL comments — _starts_ (case-insensitively) with a
mutating keyword:

```
INSERT · DELETE · UPSERT · REPLACE · UPDATE · MERGE
```

Such requests receive **HTTP 400** and are never sent to Cosmos. Matching only at the _start_ of the
statement avoids false positives on legitimate `SELECT`s that merely mention those words in a string
literal or field name (e.g. `SELECT * FROM c WHERE c.status = 'DELETED'` is allowed). The logic lives
in [`server/readOnlyGuard.ts`](server/readOnlyGuard.ts).

> This app-level guard is a safety control, not a substitute for proper access control. Pair it
> operationally with a **read-only key** or a **data-plane RBAC** role that lacks write permissions.

Credentials never reach the browser — the Cosmos/Table Storage SDKs run only on the Express proxy;
the client only talks to `/api/*`. The proxy also emits **structured audit logging** (NDJSON,
rotated/retained) of backend operations for traceability (see
[Backend diagnostics](#backend-diagnostics)).

---

## Tech stack

| Layer             | Technology                                                                          |
| ----------------- | ------------------------------------------------------------------------------------ |
| Frontend          | React 19 · TypeScript · Vite 8                                                       |
| Styling           | Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first) · shadcn-style UI + `lucide-react`  |
| SQL editor        | Monaco (`@monaco-editor/react` + `monaco-editor`) · custom Cosmos SQL grammar        |
| Server state      | TanStack Query v5                                                                     |
| Client state      | Zustand v5                                                                            |
| Drag-and-drop     | `@dnd-kit` (core/sortable/utilities) — tabs, panes                                   |
| Backend proxy     | Express 4, run via `tsx` (dev) / `node --import tsx`                                 |
| Cosmos SDK        | `@azure/cosmos` · `@azure/identity`                                                   |
| Table Storage SDK | `@azure/data-tables`                                                                  |
| Persistence       | `better-sqlite3` + `umzug` migrations (SQLite — tabs, saved queries, store cache)    |
| JSON highlighting | `highlight.js`                                                                        |
| Fonts             | Inter (UI) · JetBrains Mono (code) — bundled offline via `@fontsource-variable/*`    |
| Tests             | Vitest                                                                                |

---

## Architecture

```
Browser (React, :5173)
   │  fetch /api/*
   ▼
Vite dev proxy  ──►  Express proxy (:3001)  ──►  Azure Cosmos DB
                        │                    └──►  Azure Table Storage
                        └ owns all SDKs + credentials + SQLite
```

- The browser talks **only** to `/api/*` via [`src/services/cosmos/api.ts`](src/services/cosmos/api.ts).
  `@azure/cosmos`, `@azure/identity`, and `@azure/data-tables` are **never** imported into `src/`.
- Queries are fetched **one page at a time** with `maxItemCount` (100) and continuation tokens; the
  proxy returns `{ items, count, requestCharge, continuationToken | null }`.
- Azure Table Storage calls hit a local **SQLite cache** (`site_location_cache` table) and are
  rebuilt on demand — the proxy boots normally when Table Storage env vars are absent (lazy init).
- All server-side state — tabs/subtabs/panes, saved queries, the selected store, and the
  site-location/stockroom-zone caches — lives in a single SQLite database
  (`server/db/connection.ts`, migrated with `umzug`), not JSON files.

### API reference

| Method   | Path                                                        | Purpose                                          |
| -------- | ------------------------------------------------------------ | ------------------------------------------------- |
| `GET`    | `/api/health`                                                 | Liveness probe (`wait-on` in dev)                 |
| `GET`    | `/api/databases`                                              | List all Cosmos databases                         |
| `GET`    | `/api/databases/:dbId/containers`                             | List containers + partition key path              |
| `POST`   | `/api/databases/:dbId/containers/:containerId/query`          | Execute read-only query (paginated)               |
| `GET`    | `/api/tabs`                                                   | Load persisted tab/subtab/pane session            |
| `PUT`    | `/api/tabs`                                                   | Save tab/subtab/pane session snapshot             |
| `DELETE` | `/api/tabs`                                                   | Clear the persisted session                       |
| `GET`    | `/api/saved-queries?databaseId=&containerId=`                 | List saved queries for a container                |
| `POST`   | `/api/saved-queries`                                          | Create a saved query                              |
| `DELETE` | `/api/saved-queries/:id`                                      | Delete a saved query                              |
| `GET`    | `/api/selected-store`                                         | Get the persisted selected store                  |
| `PUT`    | `/api/selected-store`                                         | Persist the selected store                        |
| `POST`   | `/api/tables/site-location/refresh`                           | Rebuild site-location cache from Table Storage    |
| `GET`    | `/api/tables/site-location/stores`                            | List all stores (cache-first)                     |
| `GET`    | `/api/tables/site-location/stores/:partitionKey/:rowKey`      | Get store details (cache-first)                   |
| `POST`   | `/api/tables/stockroom-zones/by-partition-keys`               | List stockroom zones for one or more stores       |
| `POST`   | `/api/tables/stockroom-zones/by-ids`                          | List stockroom zones by zone ID                   |

---

## Getting started

### Prerequisites

- Node.js 20+ (developed on Node 24)
- An Azure Cosmos DB account (SQL / Core API)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example file and fill in your account details:

```bash
cp .env.example .env
```

#### Cosmos DB

| Variable           | Required when                         | Description                               |
| ------------------ | -------------------------------------- | ------------------------------------------ |
| `COSMOS_ENDPOINT`  | always                                 | Cosmos account endpoint URL               |
| `COSMOS_AUTH_MODE` | always                                 | `connection-string` or `azure-cli`        |
| `COSMOS_KEY`       | `COSMOS_AUTH_MODE=connection-string`   | Account key (prefer a **read-only** key)  |
| `PORT`             | optional (default `3001`)              | Express proxy port                        |

**Auth modes:**

- `connection-string` — uses `COSMOS_ENDPOINT` + `COSMOS_KEY`.
- `azure-cli` — uses `COSMOS_ENDPOINT` + `DefaultAzureCredential` (Azure CLI login, managed
  identity, etc.). Run `az login` first.

#### Azure Table Storage (optional — Store Details feature)

| Variable                        | Required when                       | Description                          |
| --------------------------------- | -------------------------------------- | --------------------------------------- |
| `TABLE_AUTH_MODE`                | when using Store Details            | `connection-string` or `azure-cli`   |
| `AZURE_TABLE_CONNECTION_STRING`  | `TABLE_AUTH_MODE=connection-string` | Full Table Storage connection string |
| `AZURE_TABLE_ENDPOINT`           | `TABLE_AUTH_MODE=azure-cli`         | Table Storage endpoint URL           |

The proxy starts normally without these variables — Table Storage is initialised lazily.

Required Cosmos env vars are validated on startup; a missing value fails fast with a clear message.

> `.env` is git-ignored — never commit secrets. Only `.env.example` (empty placeholders) is committed.

#### SQLite storage

| Variable         | Default              | Purpose                                                  |
| ----------------- | ---------------------- | ----------------------------------------------------------- |
| `SQLITE_DB_FILE`  | `server/data/app.db`  | Override where the app's SQLite database file is stored  |

The database holds saved queries, tab/subtab/pane sessions, the selected store, and the
site-location/stockroom-zone caches. Migrations (`umzug`) run automatically on startup.

#### Backend diagnostics

The proxy emits structured JSON Lines diagnostics to the console and rolling files in
`server/data/logs/` by default. Files older than **30 days** are removed when the proxy first writes
after startup; each file rolls at **5 MiB**. Configure these values in `.env`:

| Variable             | Default            | Purpose                                |
| -------------------- | ------------------ | -------------------------------------- |
| `LOG_DIR`            | `server/data/logs` | Directory for local NDJSON diagnostics |
| `LOG_RETENTION_DAYS` | `30`               | Number of days to retain log files     |
| `LOG_MAX_FILE_BYTES` | `5242880`          | Maximum size of each rolling log file  |

To investigate missing tabs after a restart, search the newest log for `sqlite_open_started` and
`sqlite_opened`: the events identify the resolved database file and its pre-startup existence,
size, migration state, and tab/subtab/pane counts. Search for `tab_session_replaced_empty` to find
an accepted request that replaced existing session data with an empty snapshot; use its `requestId`
to correlate the corresponding API events. Diagnostics include aggregate counts and SHA-256
fingerprints only, never query text, request bodies, credentials, or authorization headers.

### 3. Run in development

Start both the backend proxy and the frontend together:

```bash
npm run dev
```

This launches:

- **Express proxy** → http://localhost:3001 (owns the Cosmos SDK + credentials)
- **Vite dev server** → http://localhost:5173 (the UI, with `/api` proxied to the backend)

Then open **http://localhost:5173** in your browser. The two processes run with hot reload, so code
changes are picked up automatically.

#### Run the processes separately (optional)

Useful when you want to restart one side without the other. Run each in its own terminal:

```bash
# Terminal 1 — backend proxy (port 3001)
npm run dev:server

# Terminal 2 — frontend (port 5173)
npm run dev:client
```

### 4. Run a production build (optional)

Type-check, bundle the client, and preview the optimized build locally:

```bash
npm run build     # tsc -b && vite build  → outputs to dist/
npm run preview   # serve the built client
```

The proxy (`npm run dev:server`) still needs to be running for the previewed build to reach Cosmos.

### Verifying it works

1. The left panel lists your databases; expand one to see its containers.
2. Click a container to open a query tab (pre-filled with `SELECT * FROM c`).
3. Press **Execute** or **Ctrl/⌘ + Enter** — results appear as JSON below the editor.
4. Try a mutating query such as `DELETE FROM c` — the proxy rejects it with **HTTP 400** (see
   [Read-only safety](#read-only-safety-mutation-queries-are-blocked)).

> **Windows note:** the `cp .env.example .env` command above works in Git Bash / WSL. In PowerShell
> use `Copy-Item .env.example .env`; in `cmd` use `copy .env.example .env`.

---

## Scripts

| Command              | Description                                                |
| --------------------- | -------------------------------------------------------------- |
| `npm run dev`         | Start proxy + client together (via `concurrently`).           |
| `npm run dev:server`  | Start only the Express proxy.                                  |
| `npm run dev:client`  | Start only the Vite dev server.                                |
| `npm run build`       | Type-check and build the client (`tsc -b && vite build`).      |
| `npm run preview`     | Preview the production build.                                  |
| `npm test`            | Run the Vitest unit tests.                                     |
| `npm run test:watch`  | Run tests in watch mode.                                        |

---

## Testing

Unit tests cover the core logic (no Cosmos account required). Run all tests with `npm test`.

| Area             | Test file                                                                                                                                          | What it covers                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Server core      | [`server/readOnlyGuard.test.ts`](server/readOnlyGuard.test.ts)                                                                                     | Read-only guard — rejects mutating statements, allows SELECT |
| Server core      | [`server/logging.test.ts`](server/logging.test.ts)                                                                                                 | Structured NDJSON diagnostics logging                        |
| Server core      | [`server/savedQueriesStore.test.ts`](server/savedQueriesStore.test.ts)                                                                             | Saved queries CRUD — create, list, delete, validation         |
| Server core      | [`server/tabsStore.test.ts`](server/tabsStore.test.ts)                                                                                             | Tab/subtab/pane session persistence — save/load                |
| Server core      | [`server/selectedStoreStore.test.ts`](server/selectedStoreStore.test.ts)                                                                           | Selected-store persistence                                     |
| Server services  | [`server/services/siteLocationService.test.ts`](server/services/siteLocationService.test.ts)                                                       | Site-location cache — read, write, sanitise key                |
| Server services  | [`server/services/stockroomZonesService.test.ts`](server/services/stockroomZonesService.test.ts)                                                   | Stockroom zone lookups by store / by ID                        |
| Server routes    | [`server/routes/query.test.ts`](server/routes/query.test.ts)                                                                                       | Query route pagination + continuation-token handling            |
| Client store     | [`src/store/layoutStore.test.ts`](src/store/layoutStore.test.ts)                                                                                   | Layout dimensions + `localStorage` persistence                  |
| Client store     | [`src/store/tabStore.test.ts`](src/store/tabStore.test.ts)                                                                                         | Tab/subtab/pane open idempotency, close, activate, split         |
| Client store     | [`src/store/selectedResultStore.test.ts`](src/store/selectedResultStore.test.ts)                                                                   | Selected result-row state                                       |
| Client lib       | [`src/lib/queryFields.test.ts`](src/lib/queryFields.test.ts)                                                                                        | Field extraction + `childFieldNames` autocomplete                |
| Client lib       | [`src/lib/dateFormat.test.ts`](src/lib/dateFormat.test.ts)                                                                                          | UTC datetime formatting for date annotations                     |
| Client lib       | [`src/lib/queryResultTable.test.ts`](src/lib/queryResultTable.test.ts)                                                                              | Table-view row/column derivation                                 |
| Client services  | [`src/services/cosmos/api.test.ts`](src/services/cosmos/api.test.ts)                                                                               | Cosmos API client error mapping                                  |
| Client services  | [`src/services/tables/api.test.ts`](src/services/tables/api.test.ts)                                                                                | Table Storage API client                                         |
| Data annotations | [`src/features/query-results/data-annotations/monacoAnnotations.test.ts`](src/features/query-results/data-annotations/monacoAnnotations.test.ts) | Inline enum + UTC/local-time decorations                        |
| Data annotations | [`src/features/query-results/data-annotations/tabAnnotations.test.ts`](src/features/query-results/data-annotations/tabAnnotations.test.ts)       | Per-container annotation registry                                |
| Data annotations | [`src/features/query-results/data-annotations/stockroomZoneAnnotations.test.ts`](src/features/query-results/data-annotations/stockroomZoneAnnotations.test.ts) | Stockroom zone label annotations                    |

```bash
npm test
```

---

## Security notes

- Cosmos and Table Storage credentials live only in `.env` and stay **server-side**; they are
  never sent to or logged by the client.
- The read-only query guard is a safety control — do not weaken or bypass it.
- Prefer a read-only key or a data-plane RBAC role scoped without write access.

---

## Out of scope for v1

Prev/Next page navigation, result virtualization, document CRUD,
query history, and query cancellation.

See [`plans/implementation-plan.md`](plans/implementation-plan.md) and
[`plans/react-cosmos-db-data-explorer-app-plan.md`](plans/react-cosmos-db-data-explorer-app-plan.md)
for the full design and roadmap.
