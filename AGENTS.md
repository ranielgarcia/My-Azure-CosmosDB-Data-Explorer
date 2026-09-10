# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project status

**Scaffolded.** The application lives at the **repo root**: the React app source is in `src/`, the
Express proxy is in `server/`, and all config (`package.json`, `vite.config.ts`, `tsconfig*.json`)
sits at the root.

**Read these first (authoritative spec):**

- [implementation-plan.md](implementation-plan.md) — full folder structure, phase-by-phase build
  steps, config files, and a verification checklist. This is the source of truth for _how_ to build.
- [react-cosmos-db-data-explorer-app-plan.md](react-cosmos-db-data-explorer-app-plan.md) — product
  requirements, UI layout, and functional scope. The source of truth for _what_ to build.

Do not duplicate those documents here; follow and update them.

## What we're building

A minimal, dark-mode Cosmos DB Data Explorer: browse databases/containers in a tree, open
containers in tabs, run read-only Cosmos SQL queries, and view JSON results. It replicates ~90% of
the Azure Cosmos DB Data Explorer with a cleaner UI.

## Tech stack

React 18 + TypeScript + Vite · Tailwind CSS v4 (`@tailwindcss/vite`) · shadcn/ui (slate dark) ·
TanStack Query v5 · Zustand · Express + `tsx` proxy · `@azure/cosmos` · `@azure/identity`.

## Architecture rules (non-negotiable)

- **Cosmos SDK is backend-only.** Never import `@azure/cosmos` or `@azure/identity` in `src/`. The
  browser talks only to `/api/*` via `src/services/cosmos/api.ts`. Credentials must never reach the client.
- **Read-only enforcement lives in the proxy.** `POST /api/.../query` rejects queries whose text —
  after trimming whitespace and stripping leading SQL comments — _starts_ (case-insensitively) with
  `INSERT`, `DELETE`, `UPSERT`, `REPLACE`, `UPDATE`, or `MERGE` → HTTP 400. Matching only at the start
  avoids false positives on SELECTs that mention those words in string literals or field names. Pair
  it operationally with a read-only key / data-plane RBAC role. Logic lives in `server/readOnlyGuard.ts`.
- **Two auth modes via `COSMOS_AUTH_MODE`:** `connection-string` (uses `COSMOS_KEY`) or `azure-cli`
  (uses `DefaultAzureCredential`). Validate required env vars on server startup and fail with a clear message.
- **Tab identity is `` `${databaseId}__${containerId}` ``.** `openTab` is idempotent — activate an
  existing tab instead of creating a duplicate. New tabs default the query to `SELECT * FROM c`.
- **Light & dark themes with a manual toggle.** Default follows the OS (`prefers-color-scheme`);
  the user's choice persists to `localStorage` (`cosmos-theme`). An inline script in `index.html`
  sets the `html.dark` class before paint to avoid a flash; `src/store/themeStore.ts` (Zustand)
  owns the runtime state and the `<ThemeToggle>` lives in the left-sidebar header. Fonts are
  **Inter** (UI) and **JetBrains Mono** (code), bundled offline via `@fontsource-variable/*`. Theme
  is **Tailwind v4 CSS-first** (`@import "tailwindcss"` + `@theme` + `@custom-variant dark` in
  `src/index.css`); there is no v3-style `tailwind.config.ts`.
- **Path alias `@/` → `src/`** (configured in `vite.config.ts` and `tsconfig.app.json`).

## Layout & ports

- Frontend (Vite dev server): port **5173**.
- Backend proxy (Express): port **3001**. Vite proxies `/api` → `http://localhost:3001`.
- Client state: **Zustand** (`explorerStore`, `tabStore`). Server data: **TanStack Query** hooks.

## Dev commands

Run from the **repo root**:

- `npm run dev` — starts proxy + client together via `concurrently`.
- `npm run dev:server` / `npm run dev:client` — run each independently.
- `npm run build` — `tsc -b && vite build`.
- `npm run preview` — preview the production build.
- `npm test` — Vitest unit tests (read-only guard, tab store, api error mapping).

## Security

- Secrets live only in `.env` (git-ignored). Commit `.env.example` with documented, empty values only.
- Never log or return raw Cosmos credentials in responses or error messages.
- The read-only query guard is a safety control — do not weaken or bypass it.

## Query results & pagination

Each API query response contains **up to `maxItemCount` matching items** (default 100). The proxy
follows Cosmos continuation tokens internally across empty or partial SDK pages, reducing each
subsequent request to the response's remaining capacity. It returns
`{ items, count, requestCharge, continuationToken | null }`, with RU charge accumulated across all
internal requests. The client **appends** each API page; _Load more_ is shown while a continuation
token exists and hidden once it is `null`. Re-running a query **resets** the accumulated items/token.

## Out of scope for v1

Prev/Next page navigation, result virtualization, document CRUD,
query history, and query cancellation. (Basic append-style pagination via continuation tokens **is**
in scope. Light/dark theming with a persisted toggle is now **in** scope.) See the "Future Enhancements" section of
[implementation-plan.md](implementation-plan.md) before adding any of these.

## Cosmos connectivity

The Express proxy owns the Cosmos SDK — the browser never holds credentials. Connectivity is
self-contained in `server/cosmosClient.ts`:

- **Two auth modes via `COSMOS_AUTH_MODE`:** `connection-string` (uses `COSMOS_ENDPOINT` +
  `COSMOS_KEY`) or `azure-cli` (uses `COSMOS_ENDPOINT` + `DefaultAzureCredential`).
- Required env vars are validated on server startup; a missing value fails fast with a clear message.
- Databases are listed via `cosmosClient.databases.readAll()`, containers via
  `cosmosClient.database(dbId).containers.readAll()`, and queries via repeated
  `container.items.query(spec, { maxItemCount: remaining, continuationToken }).fetchNext()` calls
  until the API response reaches its item limit or Cosmos is exhausted.
- Pinned versions: `@azure/cosmos ^4.3.0`, `@azure/identity ^4.10.0`, `dotenv ^16.5.0`.
