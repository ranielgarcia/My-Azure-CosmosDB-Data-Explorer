# React Cosmos DB Data Explorer — Implementation Plan

## Overview

Build a Vite + React + TypeScript Cosmos DB Data Explorer inside `src/` that
replicates the core functionality of Azure Cosmos DB Data Explorer with a cleaner, minimal, dark-mode UI.
The Azure Cosmos SDK runs inside a lightweight Express backend proxy (`server/`) so credentials never reach
the browser. Authentication is handled entirely in `server/cosmosClient.ts`, which supports two auth modes
(`connection-string` and `azure-cli`) and validates required env vars on startup.

---

## Technology Stack

| Layer                     | Technology                                         |
| ------------------------- | -------------------------------------------------- |
| Frontend framework        | React 18 + TypeScript                              |
| Build tool                | Vite                                               |
| Styling                   | Tailwind CSS v4 (`@tailwindcss/vite`)              |
| UI components             | shadcn/ui (slate dark theme)                       |
| Server-side data fetching | React Query (TanStack Query v5)                    |
| Client state              | Zustand                                            |
| Backend proxy             | Express + tsx                                      |
| Cosmos SDK                | `@azure/cosmos ^4.3.0`                             |
| Azure Auth                | `@azure/identity ^4.10.0` (DefaultAzureCredential) |
| JSON highlighting         | highlight.js (lightweight, tree-shakeable)         |
| Dev orchestration         | concurrently                                       |

---

## Folder Structure

Everything lives at the **repo root** (the tree's root below *is* the repo root, not a nested `src/`).

```
<repo root>/
├── .env.example              # documented env vars, no secrets
├── .gitignore
├── package.json              # root scripts + all dependencies
├── index.html                # Vite entry HTML (inline no-flash theme script)
├── vite.config.ts            # Vite + /api proxy + @tailwindcss/vite plugin
├── vitest.config.ts          # test config (separate from vite.config.ts)
├── tsconfig.json             # references app + node configs
├── tsconfig.app.json         # strict mode, path alias @/ → src/
├── tsconfig.node.json
├── components.json           # shadcn/ui config
├── server/                   # Express backend proxy
│   ├── index.ts              # Express app entry point
│   ├── cosmosClient.ts       # CosmosClient factory (two auth modes)
│   ├── readOnlyGuard.ts      # isMutatingQuery() — start-anchored guard
│   ├── readOnlyGuard.test.ts
│   ├── tsconfig.json
│   └── routes/
│       ├── databases.ts      # GET /api/databases
│       ├── containers.ts     # GET /api/databases/:dbId/containers
│       └── query.ts          # POST /api/databases/:dbId/containers/:id/query
└── src/
    ├── main.tsx              # mount App, load fonts, init theme store
    ├── App.tsx               # QueryClientProvider + AppLayout
    ├── lib/
    │   └── queryClient.ts    # QueryClient singleton
    ├── types/
    │   ├── cosmos.ts         # DatabaseItem, ContainerItem, QueryResult, QueryError
    │   └── tabs.ts           # TabState
    ├── services/
    │   └── cosmos/
    │       ├── api.ts        # fetch wrappers over proxy endpoints
    │       └── index.ts      # re-exports
    ├── store/
    │   ├── explorerStore.ts  # Zustand: expanded databases, selected container
    │   └── tabStore.ts       # Zustand: tabs[], activeTabId, per-tab query/results
    ├── hooks/
    │   ├── useDatabases.ts
    │   ├── useContainers.ts
    │   └── useExecuteQuery.ts
    ├── layouts/
    │   ├── AppLayout.tsx     # flex h-screen: LeftPanel + MainArea
    │   ├── LeftPanel.tsx     # DatabaseTree + refresh button
    │   └── MainArea.tsx      # TabBar + TabContent
    ├── features/
    │   ├── databases/
    │   │   ├── DatabaseTree.tsx    # maps databases → DatabaseNode
    │   │   └── DatabaseNode.tsx    # expand/collapse + ContainerList
    │   ├── collections/
    │   │   ├── ContainerList.tsx
    │   │   └── ContainerItem.tsx   # highlighted when active, click → openTab
    │   ├── tabs/
    │   │   ├── TabBar.tsx          # horizontal scrollable tab strip
    │   │   ├── TabHandle.tsx       # single tab chip + close button
    │   │   └── TabContent.tsx      # renders QueryPanel for active tab
    │   ├── query-editor/
    │   │   ├── QueryPanel.tsx      # vertical split: editor + results + status bar
    │   │   ├── QueryEditor.tsx     # Monaco editor (SQL), Ctrl+Enter to run
    │   │   └── ExecuteButton.tsx   # shadcn Button + loading spinner
    │   └── query-results/
    │       ├── ResultsPanel.tsx    # conditional: loading / error / results / empty
    │       ├── JsonViewer.tsx      # syntax-highlighted <pre> + copy-to-clipboard
    │       └── ErrorBanner.tsx     # shadcn Alert destructive + error.message
    └── components/
        ├── LoadingSpinner.tsx
        └── EmptyState.tsx
```

---

## Phase 0 — Project Scaffolding

1. Scaffold Vite + React + TypeScript at the repo root. Because the root is **non-empty** (planning
   docs already exist), `npm create vite@latest .` refuses to run — create the project files
   manually (or scaffold in a temp dir and move them in). App source goes in `src/`.

2. Install frontend dependencies:

   ```bash
   npm install @tanstack/react-query zustand lucide-react highlight.js clsx tailwind-merge
   npm install -D tailwindcss @tailwindcss/vite @vitejs/plugin-react vitest concurrently
   ```

3. Bootstrap shadcn/ui (**Tailwind v4** — `new-york`/`slate`, CSS variables). The v4 output writes
   theme tokens into `src/index.css`; there is **no** `tailwind.config.ts`.

4. Add required shadcn/ui components:

   ```bash
   npx shadcn@latest add button textarea alert
   ```

5. Install backend proxy dependencies:

   ```bash
   npm install express cors dotenv @azure/cosmos @azure/identity
   npm install -D tsx @types/express @types/cors @types/node
   ```

6. Configure the theme **CSS-first** in `src/index.css` (`@import "tailwindcss"` + `@theme` +
   `@custom-variant dark`). Dark mode is forced by adding `.dark` to `<html>` in `main.tsx`.

7. Configure `vite.config.ts` — add `@tailwindcss/vite` plugin, proxy `/api` → `http://localhost:3001`,
   and `@/` path alias pointing to `src/`. Keep the Vitest config in a separate `vitest.config.ts`
   (avoids a tsc type clash between Vite 6 and Vitest's bundled Vite).

8. Create `.env.example` and `.gitignore`.

---

## Phase 1 — Backend Proxy Server (`server/`)

The Express proxy wraps all Cosmos SDK calls. The React app never holds Cosmos credentials.

### `server/cosmosClient.ts` — CosmosClient Factory

Self-contained factory that validates env vars on startup and selects one of two auth modes:

```typescript
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';
import 'dotenv/config';

const { COSMOS_ENDPOINT, COSMOS_KEY, COSMOS_AUTH_MODE } = process.env;

// Fail fast with a clear message if required env vars are missing.
if (!COSMOS_ENDPOINT) throw new Error('COSMOS_ENDPOINT is required');
if (!COSMOS_AUTH_MODE) throw new Error('COSMOS_AUTH_MODE is required (connection-string | azure-cli)');

function createClient(): CosmosClient {
  if (COSMOS_AUTH_MODE === 'connection-string') {
    if (!COSMOS_KEY) throw new Error('COSMOS_KEY is required when COSMOS_AUTH_MODE=connection-string');
    return new CosmosClient({ endpoint: COSMOS_ENDPOINT!, key: COSMOS_KEY });
  }
  if (COSMOS_AUTH_MODE === 'azure-cli') {
    return new CosmosClient({
      endpoint: COSMOS_ENDPOINT!,
      aadCredentials: new DefaultAzureCredential(),
    });
  }
  throw new Error(`Unknown COSMOS_AUTH_MODE: ${COSMOS_AUTH_MODE}`);
}

export const cosmosClient = createClient();
```

- Validates all required env vars on startup; throws with a clear message if any are missing.
- Exports a singleton `cosmosClient` instance.

Required env vars:

| Variable           | Required when                               |
| ------------------ | ------------------------------------------- |
| `COSMOS_ENDPOINT`  | Always                                      |
| `COSMOS_KEY`       | `COSMOS_AUTH_MODE=connection-string`        |
| `COSMOS_AUTH_MODE` | Always (`connection-string` or `azure-cli`) |

### `server/routes/databases.ts`

```
GET /api/databases
→ 200: { databases: DatabaseItem[] }
```

Uses `cosmosClient.databases.readAll().fetchAll()`.

### `server/routes/containers.ts`

```
GET /api/databases/:dbId/containers
→ 200: { containers: ContainerItem[] }
```

Uses `cosmosClient.database(dbId).containers.readAll().fetchAll()`.

### `server/routes/query.ts`

```
POST /api/databases/:dbId/containers/:containerId/query
Body: { query: string, parameters?: SqlParameter[], maxItemCount?: number, continuationToken?: string }
→ 200: { items: unknown[], count: number, requestCharge: number, continuationToken: string | null }
→ 400: { error: string }  — if a mutating keyword is detected or the query is empty
```

- **Read-only enforcement** (`server/readOnlyGuard.ts` → `isMutatingQuery`): rejects queries whose
  text — after trimming whitespace and stripping leading SQL comments — *starts* (case-insensitively)
  with `INSERT`, `DELETE`, `UPSERT`, `REPLACE`, `UPDATE`, or `MERGE` → HTTP 400. Start-anchoring
  avoids false positives on SELECTs that merely mention those words in string literals/field names.
- Fetches **one page** via `fetchNext()` using `maxItemCount` (default 100) and the optional
  `continuationToken`, returning that page's `requestCharge` and the next `continuationToken`
  (`null` when exhausted). The client appends pages and accumulates RU.

```typescript
const container = cosmosClient.database(dbId).container(containerId);
const options = { maxItemCount: maxItemCount ?? 100, continuationToken };
const page = await container.items.query({ query, parameters }, options).fetchNext();

return {
  items: page.resources,
  count: page.resources.length,
  requestCharge: page.requestCharge,
  continuationToken: page.hasMoreResults ? page.continuationToken : null,
};
```

### `server/index.ts`

- Express app with `cors({ origin: 'http://localhost:5173' })` (dev).
- JSON body parser (`express.json()`).
- Mounts all routes under `/api`.
- Global error-handler middleware returning `{ error: message, code: number }`.
- Listens on `PORT` env var (default `3001`).

---

## Phase 2 — TypeScript Types (`src/types/`)

### `src/types/cosmos.ts`

```typescript
interface DatabaseItem {
  id: string;
}
interface ContainerItem {
  id: string;
  partitionKeyPath: string;
}
interface QueryResult {
  items: unknown[];
  count: number;
  requestCharge: number;
  continuationToken: string | null;
}
interface QueryError {
  message: string;
  code?: number;
}
```

### `src/types/tabs.ts`

```typescript
interface TabState {
  id: string; // `${databaseId}__${containerId}`
  databaseId: string;
  containerId: string;
  label: string; // displayed as: `databaseId / containerId`
  query: string; // current text in the query editor
  results: QueryResult | null;
  error: QueryError | null;
  isLoading: boolean;
}
```

---

## Phase 3 — Service Layer (`src/services/cosmos/api.ts`)

Thin `fetch` wrappers — no Cosmos SDK in the browser:

```typescript
fetchDatabases(): Promise<DatabaseItem[]>
fetchContainers(dbId: string): Promise<ContainerItem[]>
executeQuery(
  dbId: string,
  containerId: string,
  query: string,
  maxItemCount?: number,
  continuationToken?: string,
): Promise<QueryResult>
```

- Read base URL from `import.meta.env.VITE_API_BASE_URL` (defaults to `/api` via Vite proxy).
- On non-2xx responses, parse the JSON error body and throw a typed `QueryError`.

---

## Phase 4 — State Management (`src/store/`)

### `src/store/explorerStore.ts` — Zustand

```
State
  expandedDatabases : Set<string>
  selectedDatabaseId  : string | null
  selectedContainerId : string | null

Actions
  toggleDatabase(dbId)           — toggle expanded/collapsed
  selectContainer(dbId, id)      — update selection highlight
```

### `src/store/tabStore.ts` — Zustand

```
State
  tabs        : TabState[]
  activeTabId : string | null

Actions
  openTab(dbId, containerId)     — idempotent: activate existing or push new tab
                                   new tabs default to query "SELECT * FROM c"
  closeTab(id)                   — remove tab; activate adjacent tab or null
  setActiveTab(id)
  updateQuery(tabId, query)
  setTabLoading(tabId, isLoading)
  setTabError(tabId, error)
  applyQueryResult(tabId, result, mode)
                                 — mode 'replace' (fresh run): results become this page, RU resets
                                 — mode 'append'  (load more): items appended, RU accumulated,
                                   continuation token advanced
```

`TabState.results` (`QueryResult | null`) holds the cumulative items, running `requestCharge`, and the
next-page `continuationToken` (null when exhausted). Re-running a query uses `replace` (resetting
items/RU); *Load more* uses `append`.

`openTab` generates `id = "${dbId}__${containerId}"`. If a tab with that id already exists it simply
activates it; otherwise it appends a new `TabState`.

---

## Phase 5 — Data Fetching Hooks (`src/hooks/`)

| Hook                  | Implementation                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `useDatabases`        | `useQuery({ queryKey: ['databases'], queryFn: fetchDatabases, staleTime: 30_000 })`                                    |
| `useContainers(dbId)` | `useQuery({ queryKey: ['containers', dbId], queryFn: () => fetchContainers(dbId), enabled: !!dbId })`                  |
| `useExecuteQuery`     | `useMutation({ mutationFn })` — `onMutate` sets loading, `onSuccess` sets results, `onError` sets error via `tabStore` |

---

## Phase 6 — Component Hierarchy

### Layout tree

```
AppLayout                          (flex h-screen bg-background)
├── LeftPanel                      (w-64 border-r overflow-y-auto)
│   ├── PanelHeader                (title "Cosmos Explorer" + RefreshButton)
│   └── DatabaseTree
└── MainArea                       (flex-1 flex-col overflow-hidden)
    ├── TabBar                     (shown only when tabs > 0)
    └── TabContent  |  EmptyState  (flex-1)
```

### Left panel

```
DatabaseTree
└── DatabaseNode  ×N
    ├── ChevronRight/Down + DatabaseIcon + DB name   (click → toggleDatabase)
    └── ContainerList  (rendered when expanded; fetches via useContainers)
        └── ContainerItem  ×N                        (click → openTab + selectContainer)
            └── highlighted with accent color when selected
```

### Main area

```
TabBar
└── TabHandle  ×N   (active tab has accent border-bottom; × close button)

TabContent  (keyed by activeTabId to preserve editor DOM state)
└── QueryPanel
    ├── QueryEditor        (Monaco editor, SQL syntax highlighting, Ctrl+Enter triggers execution)
    ├── ExecuteButton      (shadcn Button; shows Loader2 icon while loading)
    ├── StatusBar          (item count + RU charge; visible after successful query)
    └── ResultsPanel
        ├── [loading]  LoadingSpinner / Skeleton rows
        ├── [error]    ErrorBanner  (shadcn Alert destructive; message + optional code)
        ├── [results]  JsonViewer   (highlight.js <pre>; CopyButton top-right)
        └── [empty]    EmptyState   ("Run a query to see results")
```

---

## Phase 7 — App Wiring

### `src/main.tsx`

```typescript
document.documentElement.classList.add('dark')  // enforce dark mode before paint
createRoot(document.getElementById('root')!).render(<App />)
```

### `src/App.tsx`

```tsx
<QueryClientProvider client={queryClient}>
  <AppLayout />
</QueryClientProvider>
```

### `src/lib/queryClient.ts`

```typescript
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});
```

---

## Phase 8 — Configuration Files

### `.env.example`

```dotenv
COSMOS_ENDPOINT=https://<your-account>.documents.azure.com:443/
COSMOS_KEY=<your-primary-key>
COSMOS_AUTH_MODE=connection-string   # or: azure-cli
PORT=3001
VITE_API_BASE_URL=/api
```

### `vite.config.ts` (key settings)

```typescript
plugins: [react(), tailwindcss()],
resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
server: {
  proxy: {
    '/api': { target: 'http://localhost:3001', changeOrigin: true },
  },
},
```

### `package.json` scripts

```json
{
  "dev:server": "tsx watch server/index.ts",
  "dev:client": "vite",
  "dev": "concurrently \"npm:dev:server\" \"npm:dev:client\"",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest run"
}
```

### `.gitignore` additions

```
.env
dist/
server/dist/
```

---

## Phase 9 — Verification Checklist

1. `npm run dev` starts both the Express proxy (port 3001) and the Vite dev server (port 5173) without errors.
2. `GET http://localhost:3001/api/databases` returns `{ databases: [...] }`.
3. Left panel renders the database tree; each database is collapsible.
4. Clicking a container opens a new tab pre-filled with `SELECT * FROM c`.
5. Clicking the same container again activates the existing tab (idempotent — no duplicate tabs).
6. Pressing "Execute" or `Ctrl+Enter` runs the query; results appear in the JSON viewer.
7. Multiple tabs can be open simultaneously; switching between them preserves each tab's query text and results independently.
8. Closing a tab removes it; closing the last tab shows `EmptyState` in the main area.
9. A query error displays `ErrorBanner` with the message and HTTP code.
10. Queries whose (comment-stripped) text starts with `INSERT`, `DELETE`, `UPSERT`, `REPLACE`, `UPDATE`, or `MERGE` receive HTTP 400; SELECTs that merely mention those words are allowed.
11. The copy-to-clipboard button writes the full (loaded) results JSON to the clipboard.
12. Dark mode is active by default on load with no white flash.
13. Both `connection-string` and `azure-cli` auth modes work when configured in `.env`.
14. After a query with more than one page, *Load more* appends the next page and the status bar's item count + RU accumulate; it disappears once the continuation token is `null`.
15. `npm test` passes (read-only guard, tab store append/reset + idempotency, api error mapping).

---

## Key Decisions

| Decision                                      | Rationale                                                                   |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| Express backend proxy is required             | Cosmos SDK cannot run in the browser; credentials must never be client-side |
| Read-only enforcement at the proxy            | Prevents accidental data mutation from the UI                               |
| Both `connection-string` and `azure-cli` auth | Covers local dev (key) and Azure-hosted (managed identity / CLI) scenarios |
| Zustand for client state                      | Lightweight, zero boilerplate, integrates cleanly with React Query          |
| Monaco editor for the query editor            | SQL syntax highlighting, line numbers, and Ctrl/Cmd+Enter to run; theme follows the app |
| Light + dark themes with persisted toggle     | System default (`prefers-color-scheme`); choice saved to `localStorage` (`cosmos-theme`) |
| Append-style pagination (continuation tokens) | One page (100 items) per request; *Load more* appends and accumulates RU     |

---

## Future Enhancements (out of v1 scope)

1. **Monaco IntelliSense** — schema-aware autocompletion in the query editor (Monaco itself is now in v1).
2. **Prev/Next page navigation & result virtualization** — append-style *Load more* pagination is
   already in v1; classic paging and virtualized rendering of very large result sets are future work.
3. **Document CRUD** — create, edit, and delete individual documents directly from the UI.
4. **Light mode / theme toggle** — user-controlled colour scheme preference.
5. **Query history** — persist recently executed queries per container across sessions.
6. **Query cancellation** — abort in-flight requests via `AbortController`.

---

## Infrastructure Notes

All Cosmos connectivity is self-contained in the Express proxy — no external project is required.

| Concern              | Implementation                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| CosmosClient         | Single instance in `server/cosmosClient.ts`; two auth modes via `COSMOS_AUTH_MODE`                 |
| Auth (key)           | `new CosmosClient({ endpoint, key })` when `connection-string`                                      |
| Auth (identity)      | `new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() })` when `azure-cli`     |
| Env validation       | Required vars checked on startup; fail fast with a clear message                                    |
| List databases       | `cosmosClient.databases.readAll().fetchAll()`                                                       |
| List containers      | `cosmosClient.database(dbId).containers.readAll().fetchAll()`                                        |
| Execute query        | `container.items.query(spec, { maxItemCount, continuationToken }).fetchNext()`; one page per request |
| Read-only guard      | `isMutatingQuery` rejects start-anchored `INSERT`/`DELETE`/`UPSERT`/`REPLACE`/`UPDATE`/`MERGE` → 400  |

Pinned dependency versions: `@azure/cosmos ^4.3.0`, `@azure/identity ^4.10.0`, `dotenv ^16.5.0`.
