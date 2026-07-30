# Cosmos DB Data Explorer

A minimal, dark‑mode **Azure Cosmos DB Data Explorer** built with React, TypeScript, and Vite. Browse
databases and containers in a collapsible tree, open containers in tabs, run **read‑only** Cosmos SQL
queries, and view results as syntax‑highlighted JSON. It replicates ~90% of the Azure Portal's Data
Explorer with a cleaner, developer‑focused UI.

The Azure Cosmos SDK runs only inside a lightweight Express **backend proxy** — credentials never
reach the browser.

---

## Features

- **Database & container tree** — expand/collapse databases, list containers, refresh on demand.
- **Tabbed workspace** — open multiple containers at once; each tab keeps its own query text and
  results. Re‑opening the same container activates the existing tab instead of duplicating it.
- **SQL query editor** — monospace editor defaulting to `SELECT * FROM c`; run with the **Execute**
  button or **Ctrl/⌘ + Enter**.
- **Read‑only enforcement** — mutating statements are rejected by the proxy (see below).
- **Paginated results** — results load 100 items per page. **Load more** appends the next page
  (infinite‑scroll style) and accumulates the RU charge; it disappears once all pages are loaded.
  Re‑running a query resets the accumulated items.
- **JSON viewer** — pretty‑printed, syntax‑highlighted output with **copy‑to‑clipboard**.
- **Status bar** — running item count, cumulative Request Units (RU), and load state per tab.
- **Clear error surfacing** — connection/tree‑load failures show in the left panel with a retry;
  per‑query errors show an in‑tab banner with the message and HTTP status.
- **Dark mode by default** — no white flash on load (v1 has no light‑mode toggle).

---

## Read‑only safety (mutation queries are blocked)

This tool is intentionally **read‑only**. The Express proxy rejects any query whose text — after
trimming whitespace and stripping leading SQL comments — *starts* (case‑insensitively) with a
mutating keyword:

```
INSERT · DELETE · UPSERT · REPLACE · UPDATE · MERGE
```

Such requests receive **HTTP 400** and are never sent to Cosmos. Matching only at the *start* of the
statement avoids false positives on legitimate `SELECT`s that merely mention those words in a string
literal or field name (e.g. `SELECT * FROM c WHERE c.status = 'DELETED'` is allowed). The logic lives
in [`server/readOnlyGuard.ts`](server/readOnlyGuard.ts).

> This app‑level guard is a safety control, not a substitute for proper access control. Pair it
> operationally with a **read‑only key** or a **data‑plane RBAC** role that lacks write permissions.

---

## Tech stack

| Layer            | Technology                                                        |
| ---------------- | ----------------------------------------------------------------- |
| Frontend         | React 18 · TypeScript · Vite 6                                     |
| Styling          | Tailwind CSS v4 (`@tailwindcss/vite`, CSS‑first) · shadcn‑style UI |
| Server state     | TanStack Query v5                                                  |
| Client state     | Zustand                                                           |
| Backend proxy    | Express + `tsx`                                                    |
| Cosmos SDK       | `@azure/cosmos` · `@azure/identity`                               |
| JSON highlighting| highlight.js                                                      |
| Tests            | Vitest                                                            |

---

## Architecture

```
Browser (React, :5173)
   │  fetch /api/*
   ▼
Vite dev proxy  ──►  Express proxy (:3001)  ──►  Azure Cosmos DB
                        └ owns the Cosmos SDK + credentials
```

- The browser talks only to `/api/*` via [`src/services/cosmos/api.ts`](src/services/cosmos/api.ts).
  `@azure/cosmos` / `@azure/identity` are **never** imported into `src/`.
- The proxy exposes:
  - `GET  /api/databases`
  - `GET  /api/databases/:dbId/containers`
  - `POST /api/databases/:dbId/containers/:containerId/query`
- Queries are fetched **one page at a time** with `maxItemCount` (100) and continuation tokens; the
  proxy returns `{ items, count, requestCharge, continuationToken | null }`.

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

| Variable            | Required when                          | Description                                   |
| ------------------- | -------------------------------------- | --------------------------------------------- |
| `COSMOS_ENDPOINT`   | always                                 | Cosmos account endpoint URL                   |
| `COSMOS_AUTH_MODE`  | always                                 | `connection-string` or `azure-cli`            |
| `COSMOS_KEY`        | `COSMOS_AUTH_MODE=connection-string`   | Account key (prefer a **read‑only** key)      |
| `PORT`              | optional (default `3001`)              | Express proxy port                            |
| `VITE_API_BASE_URL` | optional (default `/api`)              | Client API base URL (via the Vite proxy)      |

**Auth modes:**

- `connection-string` — uses `COSMOS_ENDPOINT` + `COSMOS_KEY`.
- `azure-cli` — uses `COSMOS_ENDPOINT` + `DefaultAzureCredential` (Azure CLI login, managed identity,
  etc.). Run `az login` first.

Required env vars are validated on server startup; a missing value fails fast with a clear message.

> `.env` is git‑ignored — never commit secrets. Only `.env.example` (empty placeholders) is committed.

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

Type‑check, bundle the client, and preview the optimized build locally:

```bash
npm run build     # tsc -b && vite build  → outputs to dist/
npm run preview   # serve the built client
```

The proxy (`npm run dev:server`) still needs to be running for the previewed build to reach Cosmos.

### Verifying it works

1. The left panel lists your databases; expand one to see its containers.
2. Click a container to open a query tab (pre‑filled with `SELECT * FROM c`).
3. Press **Execute** or **Ctrl/⌘ + Enter** — results appear as JSON below the editor.
4. Try a mutating query such as `DELETE FROM c` — the proxy rejects it with **HTTP 400** (see
   [Read‑only safety](#read-only-safety-mutation-queries-are-blocked)).

> **Windows note:** the `cp .env.example .env` command above works in Git Bash / WSL. In PowerShell
> use `Copy-Item .env.example .env`; in `cmd` use `copy .env.example .env`.

---

## Scripts

| Command              | Description                                              |
| -------------------- | ------------------------------------------------------- |
| `npm run dev`        | Start proxy + client together (via `concurrently`).     |
| `npm run dev:server` | Start only the Express proxy.                           |
| `npm run dev:client` | Start only the Vite dev server.                         |
| `npm run build`      | Type‑check and build the client (`tsc -b && vite build`).|
| `npm run preview`    | Preview the production build.                           |
| `npm test`           | Run the Vitest unit tests.                              |
| `npm run test:watch` | Run tests in watch mode.                                |

---

## Testing

Unit tests cover the core logic (no Cosmos account required):

- Read‑only guard — [`server/readOnlyGuard.test.ts`](server/readOnlyGuard.test.ts)
- Tab store (open idempotency, append/reset pagination) — [`src/store/tabStore.test.ts`](src/store/tabStore.test.ts)
- API error mapping — [`src/services/cosmos/api.test.ts`](src/services/cosmos/api.test.ts)

```bash
npm test
```

---

## Security notes

- Cosmos credentials live only in `.env` and stay **server‑side**; they are never sent to or logged
  by the client.
- The read‑only query guard is a safety control — do not weaken or bypass it.
- Prefer a read‑only key or a data‑plane RBAC role scoped without write access.

---

## Out of scope for v1

Monaco editor, Prev/Next page navigation, result virtualization, document CRUD, light‑mode toggle,
query history, and query cancellation. (Append‑style pagination via continuation tokens **is** in
scope.)

See [`implementation-plan.md`](implementation-plan.md) and
[`react-cosmos-db-data-explorer-app-plan.md`](react-cosmos-db-data-explorer-app-plan.md) for the full
design and roadmap.
