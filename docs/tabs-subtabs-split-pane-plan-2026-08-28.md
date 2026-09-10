# Subtabs and Split-Pane Tabs Implementation Plan

## Goal

Keep each Cosmos database/container combination as one unique top-level tab while allowing that tab to contain multiple named query subtabs. Allow only top-level tabs, never subtabs, to be dragged, reordered, and split across up to three horizontal panes.

## Decisions

- A **tab** represents one `${databaseId}__${containerId}` pair and remains idempotent.
- A **subtab** is a named query workspace containing query text and transient execution state.
- A **pane** is one horizontal tab group. The workspace supports one to three panes.
- Subtabs support add, activate, inline rename, and close. Every parent tab must retain at least one subtab.
- Existing queries migrate losslessly into an active subtab named `Query 1`.
- Pane membership, tab order, pane-local active tabs, active subtabs, active pane, and pane widths persist in SQLite.
- Query results, errors, loading state, RU totals, and continuation tokens remain memory-only.
- Query execution behavior is protected scope: the Cosmos request, read-only guard, page size, replace/append behavior, RU accumulation, and continuation-token behavior do not change.
- `dnd-kit` provides pointer, touch, and keyboard drag behavior. Icon actions provide a deterministic keyboard path for creating left/right splits.

## Data Model

### Client

- `TabState`: parent ID, database ID, container ID, label, ordered subtabs, and active subtab ID.
- `SubtabState`: opaque ID, editable name, query, results, error, and loading state.
- `QueryWorkspaceState`: active subtab fields combined with parent database/container metadata for existing query components.
- `PaneState`: pane ID, ordered parent tab IDs, pane-local active tab ID, and normalized width.
- `TabSession`: durable tabs/subtabs, panes, and active pane ID.

### SQLite

Migration `0003_subtabs_and_panes` replaces query ownership on `tabs` with:

- `tabs(id, database_id, container_id, label, active_subtab_id)`
- `subtabs(id, tab_id, name, query, position)`
- `panes(id, position, width, active_tab_id)`
- `pane_tabs(pane_id, tab_id, position)`
- `active_pane(id, pane_id)`

Foreign keys cascade child removal. Unique constraints preserve one pane assignment per parent tab and deterministic ordering.

## Implementation Phases

### 1. Persistence foundation

1. Add migration `0003_subtabs_and_panes`.
2. Copy every legacy `tabs.query` value into `${tabId}__query-1` named `Query 1`.
3. Preserve legacy parent-tab order and global active tab in the initial pane.
4. Refactor the server session parser and store for nested transactional snapshots.
5. Validate unique IDs, parent-child ownership, pane count, pane assignments, active references, names, and widths.
6. Add nested round-trip and real legacy-schema upgrade tests.

### 2. Client state

1. Separate parent tabs from query subtabs.
2. Scope query edits, loading, errors, results, pagination, and RU accumulation to subtab IDs.
3. Keep parent tab opening idempotent.
4. Add subtab add, rename, activate, and close actions with a one-subtab minimum.
5. Add pane activation, tab movement, split creation, resizing, and empty-pane cleanup.
6. Normalize pane widths after adding or removing panes.

### 3. Query compatibility

1. Adapt the active subtab into `QueryWorkspaceState`.
2. Keep `useExecuteQuery`, `executeQuery`, and the server query route behavior unchanged.
3. Continue passing the parent tab ID to JSON annotation lookup.
4. Key editor/result component instances by subtab ID to prevent cross-subtab state leakage.
5. Keep saved-query loading and saving scoped to the active parent and subtab query.

### 4. User interface

1. Add a subtab strip above the query toolbar.
2. Add an icon-only new-subtab action.
3. Support double-click inline rename; Enter commits, Escape cancels, and invalid names restore the prior value.
4. Disable closing the final subtab.
5. Render a pane-local top-level tab bar and active query workspace.
6. Make only top-level tabs sortable with `dnd-kit`.
7. Add left/right edge drop targets for creating panes.
8. Add keyboard-accessible split-left and split-right icon actions.
9. Reuse accessible resize separators and enforce a 320px pane minimum.
10. Remove empty panes and prevent creation of a fourth pane.

### 5. Persistence integration

1. Serialize nested tabs/subtabs and pane state through the existing debounced `/api/tabs` PUT.
2. Preserve the unload `keepalive` flush.
3. Explicitly omit transient query execution state from serialized sessions.
4. Restore durable state on startup and initialize all subtab execution state as empty.

## Verification

1. Run focused server session tests, including migration from a seeded `0002` database.
2. Run focused client store tests for subtab isolation, query pagination, pane moves, splitting, width normalization, and the three-pane limit.
3. Run the complete Vitest suite and production build.
4. Verify subtab add, rename, switching, close, one-subtab minimum, and refresh restoration.
5. Verify query execution, selected-text execution, load more, RU totals, rerun reset, error handling, saved queries, and result annotations.
6. Verify parent-tab reorder, cross-pane movement, edge splitting, keyboard splitting, pane resizing, empty-pane removal, and restored layout.
7. Inspect SQLite to confirm one pane assignment per parent, no orphan subtabs, deterministic order, and no persisted results or continuation tokens.

## Scope Boundaries

- No subtab drag-and-drop, reordering, duplication, or movement between parent tabs.
- No vertical or recursive splits.
- No query result persistence, query cancellation, or result virtualization.
- No changes to Cosmos credentials, SDK usage, query route, or read-only enforcement.
