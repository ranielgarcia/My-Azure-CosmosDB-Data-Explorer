import type { QueryError, QueryResult } from "./cosmos";

export type ResultDisplayMode = "json" | "table";

export interface SubtabState {
  id: string;
  name: string;
  query: string;
  resultDisplayMode: ResultDisplayMode;
  resultColumns: string[];
  results: QueryResult | null;
  error: QueryError | null;
  isLoading: boolean;
}

export interface TabState {
  /** Parent identity: `${databaseId}__${containerId}`. */
  id: string;
  databaseId: string;
  containerId: string;
  label: string;
  subtabs: SubtabState[];
  activeSubtabId: string;
}

/** The active subtab combined with its parent Cosmos target. */
export interface QueryWorkspaceState {
  id: string;
  parentTabId: string;
  databaseId: string;
  containerId: string;
  label: string;
  query: string;
  resultDisplayMode: ResultDisplayMode;
  resultColumns: string[];
  results: QueryResult | null;
  error: QueryError | null;
  isLoading: boolean;
}

export type PersistedSubtab = Pick<
  SubtabState,
  "id" | "name" | "query" | "resultDisplayMode" | "resultColumns"
>;

export interface PersistedTab {
  id: string;
  databaseId: string;
  containerId: string;
  label: string;
  subtabs: PersistedSubtab[];
  activeSubtabId: string;
}

export interface PaneState {
  id: string;
  tabIds: string[];
  activeTabId: string;
  width: number;
}

export interface TabSession {
  tabs: PersistedTab[];
  panes: PaneState[];
  activePaneId: string | null;
}
