# CosmoScope CosmosDB Data Explorer

## Overview

CosmoScope Cosmos DB Data Explorer is a custom-built tool designed for the Support team as a streamlined alternative to the Azure Portal Cosmos DB Data Explorer.

The tool enables support team members to quickly investigate issues encountered within the X application by providing direct access to Cosmos DB data through an interface tailored to operational support workflows. Unlike the standard Azure Portal experience, CosmoScope focuses on making application data easier to understand and analyze, reducing the time required to troubleshoot incidents and validate business processes.

## 🎯 Why I Built This

The application we support runs stores across Australia, spanning multiple states and timezones.
Cosmos DB stores every timestamp in **UTC**, which makes raw documents hard to reason about during
an investigation — a UTC value gives no immediate sense of "was this during store hours?" or "what
time did this actually happen for that store's team?".

CosmoScope was built to close that gap:

- **Automatic UTC → store-local time conversion**, so the actual local time at the affected store
  is always visible alongside the raw UTC value, letting support engineers reason about store
  hours/events correctly and communicate accurately with store team members in their own timezone
  (see [Store-Aware Context](#-store-aware-context)).
- **Inline enum decoding**, so raw integer values (e.g. `"documentType": 1`) are annotated with
  their human-readable business meaning directly in the query results, removing the need to
  cross-reference application source code during an investigation (see
  [Enhanced Query Result Experience](#-enhanced-query-result-experience)).
- **Store selection as a first-class concept**, so once a support engineer picks the store they're
  investigating, its timezone, operating hours, and stockroom zone data are loaded and applied
  automatically for the rest of the session.

These annotations render directly in the query results (Monaco editor), turning raw Cosmos
documents into something a support engineer can interpret at a glance, without manual timezone
math or digging through code to decode enum values.

## 💻Local Environment Only

This application is designed to run locally only, since it relies on the Azure CLI credentials associated with your account.

---

## 🏪 Store-Aware Context

The standout feature of CosmoScope is its **store-aware context**, which bridges the gap between raw Cosmos DB documents and real-world store operations.

Support users can select a store once and continue working within that store's context throughout their investigation. The explorer enriches query results with operational information relevant to the selected store, including:

- **Store information and operating hours**, sourced directly from store master data.
- **Automatic timezone conversion**, displaying UTC timestamps in both the selected store's local timezone and the user's local timezone, eliminating the need for manual timezone calculations.

e.g.

- **Stockroom zone visibility**, showing the current status of stockroom zones, last reset timestamps, responsible operator, and device information.
- **Persistent store selection**, allowing investigators to maintain context across page refreshes and browser sessions.

Select a store

Store Information

Store Stockroom Reset Information

By embedding store-specific information directly into the investigation workflow, support engineers can more easily correlate Cosmos DB data with store operations and business events.

---

## 🔍 Enhanced Query Result Experience

CosmoScope also improves the readability of Cosmos DB documents through intelligent data enrichment and annotation.

Query results are automatically enhanced with contextual information, including:

- **Smart enum decoding**, where raw numeric values are translated into meaningful business labels while preserving the original value.
- **Inline field annotations**, allowing users to understand documents without needing to cross-reference application code or documentation.
- **Human-readable timestamps**, displayed alongside raw values for faster interpretation of events and transactions.

For example, a raw value such as:

```
"documentType": 1
```

is automatically displayed as:

Similarly, UTC timestamps are enriched with store-local time and user-local time equivalents, providing immediate business context during investigations.

These enhancements significantly reduce the effort required to interpret Cosmos DB data, enabling faster root cause analysis and more efficient support operations.

---

## 🔍 Database & Container Browsing

- Collapsible database/container tree with partition-key tooltips
- Click a container to open (or re-activate) a query tab — no duplicate tabs
- Refresh button reloads the whole database tree and store cache in one click.

---

## 📝 Query Editor

- Full Monaco editor with **Cosmos SQL syntax highlighting** and **IntelliSense** for keywords/functions.
- **Live schema-aware field autocomplete** — typing `c.` suggests actual fields (including nested, e.g. `c.address.city`) discovered from your last result set.

- Run with a button or **Ctrl+Enter**; can execute just a **highlighted selection**.
- Cursor position indicator, resizable editor pane, default `SELECT * FROM c` template on new tabs/subtabs.

---

## 📊 Query Results

- Toggle between **JSON view** (syntax-highlighted, foldable, copy-to-clipboard) and **table view** (configurable columns, click a row for full JSON detail)

Table view:

JSON view

- **Load more** pagination that transparently follows Cosmos continuation tokens under the hood (server aggregates pages up to 100 items internally).

- **Cumulative RU charge display** so users see real query cost.

- Clear loading/empty/error states throughout.

---

## 🗂️ Tabs & Layout

- **Multiple tabs**, each with **multiple named subtabs** for running variations of a query against the same container.

Double click the subtab to rename

- **Up to 3 side-by-side panes** — drag a tab to the screen edge to split, resize panes freely.

- **Full session persistence** — tab/subtab structure, query text, pane layout, and column widths are saved to SQLite and restored after a restart.
- Fully resizable, collapsible left/right sidebars and editor pane, with keyboard support (arrow keys, Home-to-reset) and drag-and-drop tab reordering.

---

## ⭐ Saved Queries

- Save, rename, search, copy, and delete queries — scoped per database/container, persisted server-side so nothing is lost between sessions

## 🔒 Security & Safety

- **Read-only enforcement on the backend** — any query starting with `INSERT`, `DELETE`, `UPSERT`, `REPLACE`, `UPDATE`, or `MERGE` is rejected with HTTP 400 before it reaches Cosmos, so accidental writes are impossible even by mistake (readOnlyGuard.ts).
- **Credentials never reach the browser** — the Cosmos/Table Storage SDKs run only on the Express proxy; the client only talks to `/api/*`.
- **Two auth modes** — connection-string (dev/test) or Azure CLI/managed identity (`DefaultAzureCredential`) for production-safe, keyless access.
- **Structured audit logging** (NDJSON, rotated/retained) of backend operations for traceability.

---

## 🎨 Polish & Accessibility

- Light/dark/system theme toggle with no flash-of-wrong-theme on load, persisted preference.
- Offline-bundled Inter + JetBrains Mono fonts (no external font requests).
- Keyboard-accessible resize handles and drag-and-drop (ARIA-labeled).

it's a faster, safer, and store-aware alternative to the Azure Portal's Data Explorer — read-only by design (safe to hand to anyone), remembers your whole workspace across sessions, and automatically translates raw UTC timestamps and stockroom codes into the context your team actually needs (store-local time, zone names, human-readable statuses) instead of raw IDs and epoch strings.

## 🔨Stack

- **Frontend**
  - React 19 + TypeScript, built with Vite 8
  - Tailwind CSS v4 (CSS-first, via `@tailwindcss/vite`)
  - shadcn/ui (slate dark theme) + `lucide-react` icons
  - TanStack Query v5 (server state) + Zustand v5 (client state)
  - Monaco Editor (`@monaco-editor/react`) for the SQL query editor, with `highlight.js` for JSON syntax highlighting
  - `@dnd-kit` (core/sortable/utilities) for drag-and-drop (tabs/panels)
  - `@fontsource-variable/inter` + `@fontsource-variable/jetbrains-mono` (self-hosted fonts)
  - Path alias `@/` → `src`

  **Backend**
  - Express 4 proxy, run via `tsx` (dev) / `node --import tsx`
  - `@azure/cosmos` + `@azure/identity` — Cosmos DB access (connection-string or Azure CLI/`DefaultAzureCredential` auth)
  - `@azure/data-tables` — Azure Table Storage client
  - `better-sqlite3` + `umzug` — local SQLite persistence (tabs, saved queries, etc.) with migrations
  - `cors`, `dotenv`

  **Tooling/Testing**
  - TypeScript 5.7, Vitest 2 (unit tests), `concurrently` + `wait-on` to run server/client together

  **Architecture notes**
  - Cosmos/Table SDKs are backend-only; the browser only calls `/api/*` (`api.ts`).
  - Read-only query enforcement lives in `readOnlyGuard.ts`.
  - Ports: Vite dev server on 5173, Express proxy on 3001 (proxied via `/api`).
