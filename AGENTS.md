# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project status

**Greenfield — not yet scaffolded.** The workspace currently contains only planning
documents. The application will be built inside `kleene-cosmos-db-data-explorer/`.

**Read these first (authoritative spec):**

- [implementation-plan.md](implementation-plan.md) — full folder structure, phase-by-phase build
  steps, config files, and a verification checklist. This is the source of truth for *how* to build.
- [react-cosmos-db-data-explorer-app-plan.md](react-cosmos-db-data-explorer-app-plan.md) — product
  requirements, UI layout, and functional scope. The source of truth for *what* to build.

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
- **Read-only enforcement lives in the proxy.** `POST /api/.../query` rejects queries whose trimmed
  text starts (case-insensitively) with `INSERT`, `DELETE`, `UPSERT`, or `REPLACE` → HTTP 400.
- **Two auth modes via `COSMOS_AUTH_MODE`:** `connection-string` (uses `COSMOS_KEY`) or `azure-cli`
  (uses `DefaultAzureCredential`). Validate required env vars on server startup and fail with a clear message.
- **Tab identity is `` `${databaseId}__${containerId}` ``.** `openTab` is idempotent — activate an
  existing tab instead of creating a duplicate. New tabs default the query to `SELECT * FROM c`.
- **Dark mode only in v1** (no toggle); set `html.dark` before paint to avoid a white flash.
- **Path alias `@/` → `src/`** (configured in `vite.config.ts` and `tsconfig.json`).

## Layout & ports

- Frontend (Vite dev server): port **5173**.
- Backend proxy (Express): port **3001**. Vite proxies `/api` → `http://localhost:3001`.
- Client state: **Zustand** (`explorerStore`, `tabStore`). Server data: **TanStack Query** hooks.

## Dev commands

Run from inside `kleene-cosmos-db-data-explorer/`:

- `npm run dev` — starts proxy + client together via `concurrently`.
- `npm run dev:server` / `npm run dev:client` — run each independently.
- `npm run build` — `tsc && vite build`.
- `npm run preview` — preview the production build.

## Security

- Secrets live only in `.env` (git-ignored). Commit `.env.example` with documented, empty values only.
- Never log or return raw Cosmos credentials in responses or error messages.
- The read-only query guard is a safety control — do not weaken or bypass it.

## Out of scope for v1

Monaco editor, result pagination/continuation tokens, document CRUD, light-mode toggle, query
history, and query cancellation. See the "Future Enhancements" section of
[implementation-plan.md](implementation-plan.md) before adding any of these.

## Cosmos connectivity

The Express proxy owns the Cosmos SDK — the browser never holds credentials. Connectivity is
self-contained in `server/cosmosClient.ts`:

- **Two auth modes via `COSMOS_AUTH_MODE`:** `connection-string` (uses `COSMOS_ENDPOINT` +
  `COSMOS_KEY`) or `azure-cli` (uses `COSMOS_ENDPOINT` + `DefaultAzureCredential`).
- Required env vars are validated on server startup; a missing value fails fast with a clear message.
- Databases are listed via `cosmosClient.databases.readAll()`, containers via
  `cosmosClient.database(dbId).containers.readAll()`, and queries via
  `container.items.query(spec).getAsyncIterator()` (accumulating `requestCharge` across pages).
- Pinned versions: `@azure/cosmos ^4.3.0`, `@azure/identity ^4.10.0`, `dotenv ^16.5.0`.
