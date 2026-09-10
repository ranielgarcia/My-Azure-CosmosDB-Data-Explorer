# React Cosmos DB Data Explorer Application Plan

Create a comprehensive implementation plan for a React.js application built at the **repository root**
(React app source in `src/`, Express proxy in `server/`, config at the root).

## Objective

Build a modern Cosmos DB Data Explorer application that closely replicates the core functionality of the Azure Cosmos DB Data Explorer while providing a cleaner, more minimal, and modern user experience.

The application will allow users to:

- Connect to a Cosmos DB account.
- Browse databases and collections (containers).
- View databases and collections in a collapsible navigation tree.
- Open collections in separate tabs.
- Create multiple named query subtabs inside each collection tab.
- Drag collection tabs into as many as three horizontal panes for side-by-side comparison.
- Execute SQL-based Cosmos DB queries.
- View query results as formatted JSON.
- Navigate and interact with multiple collections simultaneously.

## Infrastructure Requirements

All Cosmos DB connectivity lives in a lightweight Express backend proxy (`server/`) so credentials
never reach the browser. The infrastructure is self-contained and must provide:

- **Cosmos DB connectivity** — a single `CosmosClient` instance created in `server/cosmosClient.ts`.
- **Authentication and authorization** — two modes selected via `COSMOS_AUTH_MODE`:
  - `connection-string`: `new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY })`.
  - `azure-cli`: `new CosmosClient({ endpoint: COSMOS_ENDPOINT, aadCredentials: new DefaultAzureCredential() })`.
- **Environment configuration** — `COSMOS_ENDPOINT`, `COSMOS_KEY`, `COSMOS_AUTH_MODE`, and `PORT`
  loaded from a git-ignored `.env`; required values are validated on startup and fail fast if missing.
- **API integration patterns** — REST endpoints under `/api` for listing databases, listing
  containers, and executing read-only queries; the browser calls these via `fetch`, never the SDK.
- **Service architecture** — React frontend (Vite, port 5173) → Vite `/api` proxy → Express proxy
  (port 3001) → Azure Cosmos DB.
- **Dependency management** — `@azure/cosmos ^4.3.0`, `@azure/identity ^4.10.0`, `dotenv ^16.5.0`.
- **Security practices** — credentials stay server-side only; a read-only query guard rejects
  mutating statements (`INSERT`, `DELETE`, `UPSERT`, `REPLACE`) with HTTP 400.

The backend proxy is the single source of truth for connectivity, auth, and security.

## UI Requirements

### Overall Layout

Design the UI similarly to Azure Cosmos DB Data Explorer:

#### Left Navigation Panel

- Display databases in a collapsible tree structure.
- Display containers/collections nested under each database.
- Support expand and collapse behavior.
- Highlight the currently selected container.
- Allow easy navigation between databases and containers.

#### Main Content Area

When a collection is selected:

- Open the collection in a new tab.
- Support multiple open tabs.
- Allow switching between tabs without losing query state.
- Display collection-specific query editor and results.

### Query Editor

For each opened collection:

- Provide a SQL query editor similar to Azure Cosmos DB Data Explorer.
- Include a default query such as:

```sql
SELECT * FROM c
```

- Allow users to modify and execute queries.
- Execute queries against the selected Cosmos DB container.
- Display loading, success, and error states.

### Query Results

Display query results below the query editor:

- Default to a pretty-printed JSON array, with a button beside Execute that toggles table mode.
- In table mode, render one item per row and show the selected item's complete JSON in a right-side detail pane.
- Derive configurable columns from top-level properties after the first result data arrives; default to `id` plus the first other property and allow any number of selected columns.
- Persist the display mode and selected columns independently for each query subtab, but do not persist result rows or row selection.
- Use a dedicated results panel.
- Support large result sets via **append-style pagination** (continuation tokens): fetch 100 items
  per page and a _Load more_ button appends the next page, accumulating the RU charge.
- Enable scrolling.
- Use syntax highlighting if practical.
- Include copy-to-clipboard functionality.

## Design Requirements

### Technology Stack

Use:

- React.js
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Query (TanStack Query)
- Zustand (or equivalent lightweight state management)
- Azure Cosmos DB SDK

### Design Philosophy

Create a design that is:

- Minimal
- Modern
- Clean
- Professional
- Developer-focused

The design should feel like a modernized version of Azure Cosmos DB Data Explorer rather than a visual clone.

### Styling Guidelines

- Use shadcn/ui components whenever possible.
- Use Tailwind CSS for layouts and styling.
- Support dark mode by default.
- Use subtle borders and spacing.
- Avoid unnecessary visual clutter.
- Maintain high information density for power users.

## Functional Requirements

### Database Explorer

- Load all available databases.
- Load containers within each database.
- Expand/collapse databases.
- Refresh databases and containers.

### Collection Tabs

- Open multiple collections simultaneously.
- Keep independent query state per named subtab.
- Allow tab closing.
- Allow subtabs to be added, renamed inline, and closed while retaining at least one per tab.
- Preserve subtab names and query text while switching tabs or restarting the app.
- Allow top-level collection tabs, but not subtabs, to be reordered and moved between up to three horizontal panes.
- Preserve pane membership, ordering, active selections, and widths.

### Query Execution

- Execute Cosmos DB SQL queries.
- Display execution status.
- Show query errors clearly.
- Support query cancellation if feasible.

### Results Viewer

- Pretty-formatted JSON array and compact table display modes.
- Searchable top-level column configuration for table mode.
- Keyboard-accessible row selection with full-object JSON detail.
- Copy results to clipboard.
- Clear results.
- Optional JSON tree view.

## Suggested Project Structure

Provide a recommended folder structure including:

```text
src/
├── components/
├── features/
│   ├── databases/
│   ├── collections/
│   ├── query-editor/
│   └── query-results/
├── services/
│   └── cosmos/
├── hooks/
├── store/
├── layouts/
├── pages/
├── lib/
├── types/
└── utils/
```

## Deliverables

Provide:

1. Complete application architecture.
2. Folder structure.
3. Component hierarchy.
4. State management design.
5. Cosmos DB integration strategy.
6. Query execution flow.
7. Tab management design.
8. Authentication/connection strategy.
9. API/service layer design.
10. Step-by-step implementation plan.
11. Recommended third-party libraries.
12. Future enhancement recommendations.

## End Goal

The final application should provide approximately 90-95% of the core functionality of Azure Cosmos DB Data Explorer, including:

- Database navigation
- Collection browsing
- Multi-tab experience
- Cosmos SQL query execution
- JSON result visualization

while delivering a cleaner, more modern, and developer-friendly experience built with React, TypeScript, shadcn/ui, and Tailwind CSS.
