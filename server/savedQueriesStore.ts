import { randomUUID } from "node:crypto";
import { getDb } from "./db/connection.js";

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

/** Input accepted when creating a new saved query (server assigns id/createdAt). */
export interface NewSavedQuery {
  databaseId: string;
  containerId: string;
  name: string;
  query: string;
}

const MAX_NAME_LENGTH = 120;
const MAX_QUERY_LENGTH = 100_000;

interface SavedQueryRow {
  id: string;
  database_id: string;
  container_id: string;
  name: string;
  query: string;
  created_at: string;
}

function toSavedQuery(row: SavedQueryRow): SavedQuery {
  return {
    id: row.id,
    databaseId: row.database_id,
    containerId: row.container_id,
    name: row.name,
    query: row.query,
    createdAt: row.created_at,
  };
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

/** List saved queries for a single database/container, newest first. */
export async function listQueries(
  databaseId: string,
  containerId: string,
): Promise<SavedQuery[]> {
  const db = await getDb();
  const rows = db
    .prepare(
      `SELECT id, database_id, container_id, name, query, created_at
       FROM saved_queries
       WHERE database_id = ? AND container_id = ?
       ORDER BY created_at DESC`,
    )
    .all(databaseId, containerId) as SavedQueryRow[];
  return rows.map(toSavedQuery);
}

/** Create and persist a new saved query, returning the stored record. */
export async function addQuery(input: NewSavedQuery): Promise<SavedQuery> {
  const db = await getDb();
  const saved: SavedQuery = {
    id: randomUUID(),
    databaseId: input.databaseId,
    containerId: input.containerId,
    name: input.name,
    query: input.query,
    createdAt: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO saved_queries (id, database_id, container_id, name, query, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    saved.id,
    saved.databaseId,
    saved.containerId,
    saved.name,
    saved.query,
    saved.createdAt,
  );
  return saved;
}

/** Delete a saved query by id. Returns true if a record was removed. */
export async function deleteQuery(id: string): Promise<boolean> {
  const db = await getDb();
  const result = db.prepare("DELETE FROM saved_queries WHERE id = ?").run(id);
  return result.changes > 0;
}
