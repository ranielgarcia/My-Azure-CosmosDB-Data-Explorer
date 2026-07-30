import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/** A durable tab record. Transient query results are never persisted. */
export interface PersistedTab {
  id: string;
  databaseId: string;
  containerId: string;
  label: string;
  query: string;
}

export interface TabSession {
  tabs: PersistedTab[];
  activeTabId: string | null;
}

const EMPTY_SESSION: TabSession = { tabs: [], activeTabId: null };

// Persisted next to the server code so it survives restarts. Git-ignored.
// Resolved lazily so the path always reflects the current TABS_DATA_FILE.
function dataFile(): string {
  return (
    process.env.TABS_DATA_FILE ??
    join(process.cwd(), "server", "data", "tabs.json")
  );
}

// Serialize writes so overlapping saves can't interleave and corrupt the file.
let writeChain: Promise<void> = Promise.resolve();

function isPersistedTab(value: unknown): value is PersistedTab {
  if (typeof value !== "object" || value === null) return false;
  const tab = value as Record<string, unknown>;
  return (
    typeof tab.id === "string" &&
    typeof tab.databaseId === "string" &&
    typeof tab.containerId === "string" &&
    typeof tab.label === "string" &&
    typeof tab.query === "string"
  );
}

/** Validate an untrusted payload into a `TabSession`, or return null if invalid. */
export function parseSession(value: unknown): TabSession | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.tabs)) return null;
  if (!candidate.tabs.every(isPersistedTab)) return null;

  const activeTabId = candidate.activeTabId;
  if (activeTabId !== null && typeof activeTabId !== "string") return null;

  const tabs = candidate.tabs.map((tab) => ({
    id: tab.id,
    databaseId: tab.databaseId,
    containerId: tab.containerId,
    label: tab.label,
    query: tab.query,
  }));

  // Drop a dangling active id that doesn't match any tab.
  const active =
    activeTabId && tabs.some((tab) => tab.id === activeTabId)
      ? activeTabId
      : null;

  return { tabs, activeTabId: active };
}

/** Read the persisted session. Returns an empty session if missing or invalid. */
export async function getSession(): Promise<TabSession> {
  let raw: string;
  try {
    raw = await readFile(dataFile(), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return EMPTY_SESSION;
    throw err;
  }

  try {
    return parseSession(JSON.parse(raw)) ?? EMPTY_SESSION;
  } catch {
    // Corrupt JSON on disk — treat as empty rather than crashing the proxy.
    return EMPTY_SESSION;
  }
}

/** Persist a session snapshot atomically (write temp file, then rename). */
export function saveSession(session: TabSession): Promise<void> {
  writeChain = writeChain
    .catch(() => {
      // Ignore a prior write failure so this save still runs.
    })
    .then(async () => {
      const file = dataFile();
      await mkdir(dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify(session, null, 2), "utf8");
      await rename(tmp, file);
    });
  return writeChain;
}
