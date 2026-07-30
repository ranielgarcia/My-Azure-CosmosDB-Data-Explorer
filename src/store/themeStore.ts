import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "cosmos-theme";

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function resolveIsDark(mode: ThemeMode): boolean {
  return mode === "dark" || (mode === "system" && systemPrefersDark());
}

function readStoredMode(): ThemeMode {
  if (typeof localStorage === "undefined") return "system";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

function applyToDocument(isDark: boolean): void {
  document.documentElement.classList.toggle("dark", isDark);
}

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: readStoredMode(),
  isDark: resolveIsDark(readStoredMode()),
  setMode: (mode) => {
    const isDark = resolveIsDark(mode);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, mode);
    }
    applyToDocument(isDark);
    set({ mode, isDark });
  },
  // Toggle explicitly between light and dark (leaving "system" behind).
  toggle: () => {
    const next: ThemeMode = get().isDark ? "light" : "dark";
    get().setMode(next);
  },
}));

/**
 * Wire the store to the OS preference and ensure the document class matches the
 * resolved theme. The inline <head> script applies the initial class; this keeps
 * everything in sync afterwards.
 */
export function initTheme(): void {
  const { mode, isDark } = useThemeStore.getState();
  applyToDocument(isDark);

  if (typeof window === "undefined") return;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", () => {
    // Only follow the OS when the user hasn't pinned a specific theme.
    if (useThemeStore.getState().mode !== "system") return;
    const nextIsDark = resolveIsDark("system");
    applyToDocument(nextIsDark);
    useThemeStore.setState({ isDark: nextIsDark });
  });

  // Guard against a stale class if storage changed in another tab.
  applyToDocument(resolveIsDark(mode));
}
