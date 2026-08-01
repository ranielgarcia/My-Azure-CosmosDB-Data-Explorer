import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/** A saved query scoped to a single database/container. */
export interface SavedQuery {
  id: string;
  databaseId: string;
  containerId: string;
  name: string;
  query: string;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
}

interface SavedQueriesFile {
  queries: SavedQuery[];
}

/** Input accepted when creating a new saved query (server assigns id/createdAt). */
export interface NewSavedQuery {
  databaseId: string;
  containerId: string;
  name: string;
  query: string;
}

const MAX_NAME_LENGTH = 120;
const MAX_QUERY_LENGTH = 100_000;

const EMPTY_FILE: SavedQueriesFile = { queries: [] };

// Persisted next to the server code so it survives restarts. Git-ignored.
// Resolved lazily so the path always reflects the current SAVED_QUERIES_DATA_FILE.
function dataFile(): string {
  return (
    process.env.SAVED_QUERIES_DATA_FILE ??
    join(process.cwd(), "server", "data", "saved-queries.json")
  );
}

// Serialize writes so overlapping saves can't interleave and corrupt the file.
let writeChain: Promise<void> = Promise.resolve();

function isSavedQuery(value: unknown): value is SavedQuery {
  if (typeof value !== "object" || value === null) return false;
  const q = value as Record<string, unknown>;
  return (
    typeof q.id === "string" &&
    typeof q.databaseId === "string" &&
    typeof q.containerId === "string" &&
    typeof q.name === "string" &&
    typeof q.query === "string" &&
    typeof q.createdAt === "string"
  );
}

/** Parse an untrusted file payload into a list of saved queries. */
function parseFile(value: unknown): SavedQueriesFile {
  if (typeof value !== "object" || value === null) return EMPTY_FILE;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.queries)) return EMPTY_FILE;
  return { queries: candidate.queries.filter(isSavedQuery) };
}

/**
 * Validate an untrusted create payload. Returns a trimmed record or null if the
 * required fields are missing or empty.
 */
export function parseNewQuery(value: unknown): NewSavedQuery | null {
  if (typeof value !== "object" || value === null) return null;
  const c = value as Record<string, unknown>;
  if (
    typeof c.databaseId !== "string" ||
    typeof c.containerId !== "string" ||
    typeof c.name !== "string" ||
    typeof c.query !== "string"
  ) {
    return null;
  }

  const databaseId = c.databaseId.trim();
  const containerId = c.containerId.trim();
  const name = c.name.trim();
  const query = c.query.trim();

  if (!databaseId || !containerId || !name || !query) return null;
  if (name.length > MAX_NAME_LENGTH || query.length > MAX_QUERY_LENGTH) {
    return null;
  }

  return { databaseId, containerId, name, query };
}

/** Read the whole file. Returns an empty list if missing or corrupt. */
async function readAll(): Promise<SavedQuery[]> {
  let raw: string;
  try {
    raw = await readFile(dataFile(), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }

  try {
    return parseFile(JSON.parse(raw)).queries;
  } catch {
    // Corrupt JSON on disk — treat as empty rather than crashing the proxy.
    return [];
  }
}

/** Persist the full list atomically (write temp file, then rename). */
function writeAll(queries: SavedQuery[]): Promise<void> {
  writeChain = writeChain
    .catch(() => {
      // Ignore a prior write failure so this save still runs.
    })
    .then(async () => {
      const file = dataFile();
      await mkdir(dirname(file), { recursive: true });
      const tmp = `${file}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify({ queries }, null, 2), "utf8");
      await rename(tmp, file);
    });
  return writeChain;
}

/** List saved queries for a single database/container, newest first. */
export async function listQueries(
  databaseId: string,
  containerId: string,
): Promise<SavedQuery[]> {
  const all = await readAll();
  return all
    .filter((q) => q.databaseId === databaseId && q.containerId === containerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Create and persist a new saved query, returning the stored record. */
export async function addQuery(input: NewSavedQuery): Promise<SavedQuery> {
  const all = await readAll();
  const saved: SavedQuery = {
    id: randomUUID(),
    databaseId: input.databaseId,
    containerId: input.containerId,
    name: input.name,
    query: input.query,
    createdAt: new Date().toISOString(),
  };
  await writeAll([...all, saved]);
  return saved;
}

/** Delete a saved query by id. Returns true if a record was removed. */
export async function deleteQuery(id: string): Promise<boolean> {
  const all = await readAll();
  const remaining = all.filter((q) => q.id !== id);
  if (remaining.length === all.length) return false;
  await writeAll(remaining);
  return true;
}
