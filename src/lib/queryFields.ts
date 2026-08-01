/**
 * System properties Cosmos DB attaches to every document. They are noise in
 * autocomplete, so we hide them — except `id`, which users query frequently.
 */
const SYSTEM_PROPS = new Set(["_rid", "_self", "_etag", "_attachments", "_ts"]);

/**
 * Derives a sorted, de-duplicated list of top-level property names from a set of
 * result documents. Non-object entries (primitives, arrays, null) are ignored,
 * and Cosmos system properties are filtered out. Used to feed schema-aware
 * IntelliSense in the query editor.
 */
export function extractDocumentFields(items: unknown[]): string[] {
  const fields = new Set<string>();

  for (const item of items) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      continue;
    }

    for (const key of Object.keys(item)) {
      if (!SYSTEM_PROPS.has(key)) {
        fields.add(key);
      }
    }
  }

  return Array.from(fields).sort((a, b) => a.localeCompare(b));
}
