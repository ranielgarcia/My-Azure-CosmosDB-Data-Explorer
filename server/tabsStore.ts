import { createHash } from "node:crypto";
import { getDb } from "./db/connection.js";
import { logEvent } from "./logging.js";

export interface PersistedSubtab {
  id: string;
  name: string;
  query: string;
  resultDisplayMode: "json" | "table";
  resultColumns: string[];
}

/** A durable parent tab record. Transient query results are never persisted. */
export interface PersistedTab {
  id: string;
  databaseId: string;
  containerId: string;
  label: string;
  subtabs: PersistedSubtab[];
  activeSubtabId: string;
}

export interface PersistedPane {
  id: string;
  tabIds: string[];
  activeTabId: string;
  width: number;
}

export interface TabSession {
  tabs: PersistedTab[];
  panes: PersistedPane[];
  activePaneId: string | null;
}

interface TabRow {
  id: string;
  database_id: string;
  container_id: string;
  label: string;
  active_subtab_id: string;
}

interface SubtabRow {
  id: string;
  tab_id: string;
  name: string;
  query: string;
  result_display_mode: "json" | "table";
  result_columns_json: string;
}

interface PaneRow {
  id: string;
  width: number;
  active_tab_id: string;
}

interface PaneTabRow {
  pane_id: string;
  tab_id: string;
}

export interface SessionLogContext {
  requestId?: string;
}

interface SessionCounts {
  tabs: number;
  subtabs: number;
  panes: number;
  paneTabs: number;
}

function countSession(session: TabSession): SessionCounts {
  return {
    tabs: session.tabs.length,
    subtabs: session.tabs.reduce((count, tab) => count + tab.subtabs.length, 0),
    panes: session.panes.length,
    paneTabs: session.panes.reduce(
      (count, pane) => count + pane.tabIds.length,
      0,
    ),
  };
}

function persistedCounts(db: Awaited<ReturnType<typeof getDb>>): SessionCounts {
  return db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM tabs) AS tabs,
        (SELECT COUNT(*) FROM subtabs) AS subtabs,
        (SELECT COUNT(*) FROM panes) AS panes,
        (SELECT COUNT(*) FROM pane_tabs) AS paneTabs`,
    )
    .get() as SessionCounts;
}

function sessionFingerprint(session: TabSession): string {
  const structure = session.tabs.map((tab) => ({
    id: tab.id,
    activeSubtabId: tab.activeSubtabId,
    subtabs: tab.subtabs.map((subtab) => ({
      id: subtab.id,
      querySha256: createHash("sha256").update(subtab.query).digest("hex"),
      resultDisplayMode: subtab.resultDisplayMode,
      resultColumns: subtab.resultColumns,
    })),
  }));
  return createHash("sha256")
    .update(
      JSON.stringify({
        structure,
        panes: session.panes,
        activePaneId: session.activePaneId,
      }),
    )
    .digest("hex");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function parseResultColumns(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (
    !value.every(
      (column) =>
        typeof column === "string" &&
        column.length > 0 &&
        column === column.trim(),
    )
  ) {
    return null;
  }
  return new Set(value).size === value.length ? value : null;
}

function normalizePersistedSubtab(value: unknown): PersistedSubtab | null {
  if (typeof value !== "object" || value === null) return null;
  const subtab = value as Record<string, unknown>;
  if (
    !isNonEmptyString(subtab.id) ||
    !isNonEmptyString(subtab.name) ||
    subtab.name !== subtab.name.trim() ||
    subtab.name.length > 80 ||
    typeof subtab.query !== "string"
  ) {
    return null;
  }
  const resultDisplayMode = subtab.resultDisplayMode ?? "json";
  const resultColumns = parseResultColumns(subtab.resultColumns ?? []);
  if (
    (resultDisplayMode !== "json" && resultDisplayMode !== "table") ||
    resultColumns === null
  ) {
    return null;
  }
  return {
    id: subtab.id,
    name: subtab.name,
    query: subtab.query,
    resultDisplayMode,
    resultColumns,
  };
}

function isPersistedTab(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const tab = value as Record<string, unknown>;
  return (
    typeof tab.id === "string" &&
    typeof tab.databaseId === "string" &&
    typeof tab.containerId === "string" &&
    typeof tab.label === "string" &&
    Array.isArray(tab.subtabs) &&
    tab.subtabs.length > 0 &&
    tab.subtabs.every((subtab) => normalizePersistedSubtab(subtab) !== null) &&
    isNonEmptyString(tab.activeSubtabId)
  );
}

function isPersistedPane(value: unknown): value is PersistedPane {
  if (typeof value !== "object" || value === null) return false;
  const pane = value as Record<string, unknown>;
  return (
    isNonEmptyString(pane.id) &&
    Array.isArray(pane.tabIds) &&
    pane.tabIds.every(isNonEmptyString) &&
    isNonEmptyString(pane.activeTabId) &&
    typeof pane.width === "number" &&
    Number.isFinite(pane.width) &&
    pane.width > 0
  );
}

/** Validate an untrusted payload into a `TabSession`, or return null if invalid. */
export function parseSession(value: unknown): TabSession | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.tabs)) return null;
  if (!candidate.tabs.every(isPersistedTab)) return null;
  if (!Array.isArray(candidate.panes)) return null;
  if (candidate.panes.length > 3 || !candidate.panes.every(isPersistedPane)) {
    return null;
  }
  const activePaneId = candidate.activePaneId;
  if (activePaneId !== null && typeof activePaneId !== "string") return null;

  const tabs = candidate.tabs.map((value: unknown) => {
    const tab = value as Record<string, unknown>;
    return {
      id: tab.id as string,
      databaseId: tab.databaseId as string,
      containerId: tab.containerId as string,
      label: tab.label as string,
      subtabs: (tab.subtabs as unknown[]).map(
        (subtab) => normalizePersistedSubtab(subtab)!,
      ),
      activeSubtabId: tab.activeSubtabId as string,
    };
  });
  const panes = candidate.panes as PersistedPane[];
  const tabIds = new Set(tabs.map((tab) => tab.id));
  const subtabIds = tabs.flatMap((tab) =>
    tab.subtabs.map((subtab) => subtab.id),
  );
  const paneIds = new Set(panes.map((pane) => pane.id));
  const assignedTabIds = panes.flatMap((pane) => pane.tabIds);

  if (tabIds.size !== tabs.length) return null;
  if (tabs.some((tab) => tab.id !== `${tab.databaseId}__${tab.containerId}`)) {
    return null;
  }
  if (new Set(subtabIds).size !== subtabIds.length) return null;
  if (paneIds.size !== panes.length) return null;
  if (new Set(assignedTabIds).size !== assignedTabIds.length) return null;
  if (assignedTabIds.length !== tabs.length) return null;
  if (assignedTabIds.some((id) => !tabIds.has(id))) return null;
  if (
    tabs.some(
      (tab) => !tab.subtabs.some((subtab) => subtab.id === tab.activeSubtabId),
    )
  ) {
    return null;
  }
  if (
    panes.some(
      (pane) =>
        pane.tabIds.length === 0 || !pane.tabIds.includes(pane.activeTabId),
    )
  ) {
    return null;
  }
  if (tabs.length === 0) return null;
  if (panes.length === 0) return null;
  if (activePaneId !== null && !paneIds.has(activePaneId)) return null;
  if (panes.length > 0 && activePaneId === null) return null;

  return { tabs, panes, activePaneId };
}

/** Read the persisted session, ordered as it was last saved. */
export async function getSession(
  context: SessionLogContext = {},
): Promise<TabSession> {
  const startedAt = performance.now();
  try {
    const db = await getDb();
    const rows = db
      .prepare(
        `SELECT id, database_id, container_id, label, active_subtab_id
       FROM tabs`,
      )
      .all() as TabRow[];
    const subtabRows = db
      .prepare(
        `SELECT id, tab_id, name, query, result_display_mode, result_columns_json
       FROM subtabs
       ORDER BY tab_id ASC, position ASC`,
      )
      .all() as SubtabRow[];
    const paneRows = db
      .prepare(
        `SELECT id, width, active_tab_id
       FROM panes
       ORDER BY position ASC`,
      )
      .all() as PaneRow[];
    const paneTabRows = db
      .prepare(
        `SELECT pane_id, tab_id
       FROM pane_tabs
       ORDER BY pane_id ASC, position ASC`,
      )
      .all() as PaneTabRow[];
    const activePane = db
      .prepare("SELECT pane_id FROM active_pane WHERE id = 1")
      .get() as { pane_id: string | null } | undefined;

    const tabsById = new Map(
      rows.map((row) => [
        row.id,
        {
          id: row.id,
          databaseId: row.database_id,
          containerId: row.container_id,
          label: row.label,
          subtabs: [] as PersistedSubtab[],
          activeSubtabId: row.active_subtab_id,
        },
      ]),
    );
    for (const row of subtabRows) {
      let resultColumns: string[] = [];
      try {
        resultColumns =
          parseResultColumns(JSON.parse(row.result_columns_json)) ?? [];
      } catch {
        resultColumns = [];
      }
      tabsById.get(row.tab_id)?.subtabs.push({
        id: row.id,
        name: row.name,
        query: row.query,
        resultDisplayMode:
          row.result_display_mode === "table" ? "table" : "json",
        resultColumns,
      });
    }

    const orderedTabIds = paneTabRows.map((row) => row.tab_id);
    const tabs = orderedTabIds
      .map((id) => tabsById.get(id))
      .filter((tab): tab is PersistedTab => tab !== undefined);
    const panes = paneRows.map((pane) => ({
      id: pane.id,
      tabIds: paneTabRows
        .filter((row) => row.pane_id === pane.id)
        .map((row) => row.tab_id),
      activeTabId: pane.active_tab_id,
      width: pane.width,
    }));

    const session = { tabs, panes, activePaneId: activePane?.pane_id ?? null };
    logEvent({
      event: "tab_session_loaded",
      requestId: context.requestId,
      details: {
        ...countSession(session),
        durationMs: Math.round(performance.now() - startedAt),
        fingerprint: sessionFingerprint(session),
      },
    });
    return session;
  } catch (error) {
    logEvent({
      event: "tab_session_load_failed",
      level: "error",
      requestId: context.requestId,
      details: {
        durationMs: Math.round(performance.now() - startedAt),
        message: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

/** Delete the complete persisted session after an explicit user action. */
export async function clearSession(
  context: SessionLogContext = {},
): Promise<void> {
  const startedAt = performance.now();
  const db = await getDb();
  const clear = db.transaction(() => {
    const before = persistedCounts(db);
    db.prepare("DELETE FROM active_pane").run();
    db.prepare("DELETE FROM pane_tabs").run();
    db.prepare("DELETE FROM panes").run();
    db.prepare("DELETE FROM subtabs").run();
    db.prepare("DELETE FROM tabs").run();
    return before;
  });

  try {
    const previous = clear();
    logEvent({
      event: "tab_session_cleared",
      requestId: context.requestId,
      details: {
        previousTabs: previous.tabs,
        previousSubtabs: previous.subtabs,
        previousPanes: previous.panes,
        previousPaneTabs: previous.paneTabs,
        durationMs: Math.round(performance.now() - startedAt),
      },
    });
  } catch (error) {
    logEvent({
      event: "tab_session_clear_failed",
      level: "error",
      requestId: context.requestId,
      details: {
        durationMs: Math.round(performance.now() - startedAt),
        message: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

/** Persist a session snapshot: replaces every tab row and the active tab id. */
export async function saveSession(
  session: TabSession,
  context: SessionLogContext = {},
): Promise<void> {
  const startedAt = performance.now();
  const db = await getDb();
  const insertTab = db.prepare(
    `INSERT INTO tabs (id, database_id, container_id, label, active_subtab_id)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const insertSubtab = db.prepare(
    `INSERT INTO subtabs
       (id, tab_id, name, query, result_display_mode, result_columns_json, position)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertPane = db.prepare(
    `INSERT INTO panes (id, position, width, active_tab_id)
     VALUES (?, ?, ?, ?)`,
  );
  const insertPaneTab = db.prepare(
    `INSERT INTO pane_tabs (pane_id, tab_id, position)
     VALUES (?, ?, ?)`,
  );

  const persist = db.transaction((snapshot: TabSession) => {
    const before = persistedCounts(db);
    const after = countSession(snapshot);
    logEvent({
      event: "tab_session_replace_started",
      requestId: context.requestId,
      details: {
        ...before,
        nextTabs: after.tabs,
        nextSubtabs: after.subtabs,
        nextPanes: after.panes,
        nextPaneTabs: after.paneTabs,
      },
    });
    db.prepare("DELETE FROM active_pane").run();
    db.prepare("DELETE FROM pane_tabs").run();
    db.prepare("DELETE FROM panes").run();
    db.prepare("DELETE FROM subtabs").run();
    db.prepare("DELETE FROM tabs").run();
    snapshot.tabs.forEach((tab) => {
      insertTab.run(
        tab.id,
        tab.databaseId,
        tab.containerId,
        tab.label,
        tab.activeSubtabId,
      );
      tab.subtabs.forEach((subtab, position) => {
        insertSubtab.run(
          subtab.id,
          tab.id,
          subtab.name,
          subtab.query,
          subtab.resultDisplayMode,
          JSON.stringify(subtab.resultColumns),
          position,
        );
      });
    });
    snapshot.panes.forEach((pane, position) => {
      insertPane.run(pane.id, position, pane.width, pane.activeTabId);
      pane.tabIds.forEach((tabId, tabPosition) => {
        insertPaneTab.run(pane.id, tabId, tabPosition);
      });
    });
    if (snapshot.activePaneId) {
      db.prepare("INSERT INTO active_pane (id, pane_id) VALUES (1, ?)").run(
        snapshot.activePaneId,
      );
    }
    return { before, after };
  });

  try {
    const { before, after } = persist(session);
    const details = {
      ...after,
      previousTabs: before.tabs,
      previousSubtabs: before.subtabs,
      previousPanes: before.panes,
      previousPaneTabs: before.paneTabs,
      durationMs: Math.round(performance.now() - startedAt),
      fingerprint: sessionFingerprint(session),
    };
    logEvent({
      event: "tab_session_replace_completed",
      requestId: context.requestId,
      details,
    });
    if (after.tabs === 0 && before.tabs > 0) {
      logEvent({
        event: "tab_session_replaced_empty",
        level: "warn",
        requestId: context.requestId,
        details,
      });
    }
  } catch (error) {
    logEvent({
      event: "tab_session_replace_failed",
      level: "error",
      requestId: context.requestId,
      details: {
        durationMs: Math.round(performance.now() - startedAt),
        nextTabs: session.tabs.length,
        message: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
