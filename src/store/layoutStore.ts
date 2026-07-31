import { create } from "zustand";

const SIDEBAR_KEY = "cosmos-sidebar-width";
const STORE_PANEL_KEY = "cosmos-store-panel-height";

export const DEFAULT_SIDEBAR_WIDTH = 256;
export const MIN_SIDEBAR_WIDTH = 200;
export const MAX_SIDEBAR_WIDTH = 560;

export const DEFAULT_STORE_PANEL_HEIGHT = 280;
export const MIN_STORE_PANEL_HEIGHT = 120;

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

interface LayoutState {
  sidebarWidth: number;
  storePanelHeight: number;
  /** Set the sidebar width, clamped to [MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH]. */
  setSidebarWidth: (width: number) => void;
  /** Set the store-panel height, clamped to [MIN_STORE_PANEL_HEIGHT, max]. */
  setStorePanelHeight: (height: number, max?: number) => void;
  resetSidebarWidth: () => void;
  resetStorePanelHeight: () => void;
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
  resetSidebarWidth: () => {
    persist(SIDEBAR_KEY, DEFAULT_SIDEBAR_WIDTH);
    set({ sidebarWidth: DEFAULT_SIDEBAR_WIDTH });
  },
  resetStorePanelHeight: () => {
    persist(STORE_PANEL_KEY, DEFAULT_STORE_PANEL_HEIGHT);
    set({ storePanelHeight: DEFAULT_STORE_PANEL_HEIGHT });
  },
}));
