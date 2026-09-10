import { getDb } from "./db/connection.js";

/** Validate an untrusted payload into a store id (or null), or `undefined` if invalid. */
export function parseSelectedStoreId(
  value: unknown,
): string | null | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const storeId = (value as Record<string, unknown>).storeId;
  if (storeId === null) return null;
  if (typeof storeId === "string" && storeId.length > 0) return storeId;
  return undefined;
}

/** Read the persisted selected store id, or null when none is selected. */
export async function getSelectedStoreId(): Promise<string | null> {
  const db = await getDb();
  const row = db
    .prepare("SELECT store_id FROM selected_store WHERE id = 1")
    .get() as { store_id: string | null } | undefined;
  return row?.store_id ?? null;
}

/** Persist the selected store id (or clear it with null). */
export async function saveSelectedStoreId(
  storeId: string | null,
): Promise<void> {
  const db = await getDb();
  db.prepare(
    `INSERT INTO selected_store (id, store_id) VALUES (1, ?)
     ON CONFLICT (id) DO UPDATE SET store_id = excluded.store_id`,
  ).run(storeId);
}
