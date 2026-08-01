import { create } from "zustand";

const SIDEBAR_KEY = "cosmos-sidebar-width";
const STORE_PANEL_KEY = "cosmos-store-panel-height";
const QUERY_EDITOR_KEY = "cosmos-query-editor-height";
const RIGHT_SIDEBAR_KEY = "cosmos-right-sidebar-width";
const SAVED_QUERIES_OPEN_KEY = "cosmos-saved-queries-open";

export const DEFAULT_SIDEBAR_WIDTH = 256;
export const MIN_SIDEBAR_WIDTH = 200;
export const MAX_SIDEBAR_WIDTH = 560;

export const DEFAULT_STORE_PANEL_HEIGHT = 280;
export const MIN_STORE_PANEL_HEIGHT = 120;

export const DEFAULT_QUERY_EDITOR_HEIGHT = 160;
export const MIN_QUERY_EDITOR_HEIGHT = 80;

export const DEFAULT_RIGHT_SIDEBAR_WIDTH = 288;
export const MIN_RIGHT_SIDEBAR_WIDTH = 220;
export const MAX_RIGHT_SIDEBAR_WIDTH = 560;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function readStoredNumber(key: string, fallback: number): number {
  if (typeof localStorage === "undefined") return fallback;
  const stored = localStorage.getItem(key);
  if (stored === null) return fallback;
  const parsed = Number.parseFloat(stored);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function persist(key: string, value: number): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, String(value));
}

function readStoredBool(key: string, fallback: boolean): boolean {
  if (typeof localStorage === "undefined") return fallback;
  const stored = localStorage.getItem(key);
  if (stored === null) return fallback;
  return stored === "true";
}

function persistBool(key: string, value: boolean): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, String(value));
}

interface LayoutState {
  sidebarWidth: number;
  storePanelHeight: number;
  queryEditorHeight: number;
  rightSidebarWidth: number;
  savedQueriesOpen: boolean;
  setSidebarWidth: (width: number) => void;
  setStorePanelHeight: (height: number, max?: number) => void;
  setQueryEditorHeight: (height: number, max?: number) => void;
  setRightSidebarWidth: (width: number) => void;
  setSavedQueriesOpen: (open: boolean) => void;
  toggleSavedQueries: () => void;
  resetSidebarWidth: () => void;
  resetStorePanelHeight: () => void;
  resetQueryEditorHeight: () => void;
  resetRightSidebarWidth: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarWidth: clamp(
    readStoredNumber(SIDEBAR_KEY, DEFAULT_SIDEBAR_WIDTH),
    MIN_SIDEBAR_WIDTH,
    MAX_SIDEBAR_WIDTH,
  ),
  storePanelHeight: Math.max(
    readStoredNumber(STORE_PANEL_KEY, DEFAULT_STORE_PANEL_HEIGHT),
    MIN_STORE_PANEL_HEIGHT,
  ),
  queryEditorHeight: Math.max(
    readStoredNumber(QUERY_EDITOR_KEY, DEFAULT_QUERY_EDITOR_HEIGHT),
    MIN_QUERY_EDITOR_HEIGHT,
  ),
  rightSidebarWidth: clamp(
    readStoredNumber(RIGHT_SIDEBAR_KEY, DEFAULT_RIGHT_SIDEBAR_WIDTH),
    MIN_RIGHT_SIDEBAR_WIDTH,
    MAX_RIGHT_SIDEBAR_WIDTH,
  ),
  savedQueriesOpen: readStoredBool(SAVED_QUERIES_OPEN_KEY, false),
  setSidebarWidth: (width) => {
    const clamped = clamp(width, MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH);
    persist(SIDEBAR_KEY, clamped);
    set({ sidebarWidth: clamped });
  },
  setStorePanelHeight: (height, max = Number.POSITIVE_INFINITY) => {
    const upper = Math.max(MIN_STORE_PANEL_HEIGHT, max);
    const clamped = clamp(height, MIN_STORE_PANEL_HEIGHT, upper);
    persist(STORE_PANEL_KEY, clamped);
    set({ storePanelHeight: clamped });
  },
  setQueryEditorHeight: (height, max = Number.POSITIVE_INFINITY) => {
    const upper = Math.max(MIN_QUERY_EDITOR_HEIGHT, max);
    const clamped = clamp(height, MIN_QUERY_EDITOR_HEIGHT, upper);
    persist(QUERY_EDITOR_KEY, clamped);
    set({ queryEditorHeight: clamped });
  },
  setRightSidebarWidth: (width) => {
    const clamped = clamp(
      width,
      MIN_RIGHT_SIDEBAR_WIDTH,
      MAX_RIGHT_SIDEBAR_WIDTH,
    );
    persist(RIGHT_SIDEBAR_KEY, clamped);
    set({ rightSidebarWidth: clamped });
  },
  setSavedQueriesOpen: (open) => {
    persistBool(SAVED_QUERIES_OPEN_KEY, open);
    set({ savedQueriesOpen: open });
  },
  toggleSavedQueries: () =>
    set((state) => {
      const next = !state.savedQueriesOpen;
      persistBool(SAVED_QUERIES_OPEN_KEY, next);
      return { savedQueriesOpen: next };
    }),
  resetSidebarWidth: () => {
    persist(SIDEBAR_KEY, DEFAULT_SIDEBAR_WIDTH);
    set({ sidebarWidth: DEFAULT_SIDEBAR_WIDTH });
  },
  resetStorePanelHeight: () => {
    persist(STORE_PANEL_KEY, DEFAULT_STORE_PANEL_HEIGHT);
    set({ storePanelHeight: DEFAULT_STORE_PANEL_HEIGHT });
  },
  resetQueryEditorHeight: () => {
    persist(QUERY_EDITOR_KEY, DEFAULT_QUERY_EDITOR_HEIGHT);
    set({ queryEditorHeight: DEFAULT_QUERY_EDITOR_HEIGHT });
  },
  resetRightSidebarWidth: () => {
    persist(RIGHT_SIDEBAR_KEY, DEFAULT_RIGHT_SIDEBAR_WIDTH);
    set({ rightSidebarWidth: DEFAULT_RIGHT_SIDEBAR_WIDTH });
  },
}));
