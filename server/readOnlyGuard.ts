/**
 * Read-only query guard.
 *
 * The Cosmos SQL query API only executes read (SELECT) queries, so this is a
 * defense-in-depth safety control layered on top of RBAC / read-only keys.
 *
 * A naive "keyword anywhere" check would reject legitimate SELECTs that merely
 * mention these words in a string literal or field name (e.g.
 * `SELECT * FROM c WHERE c.status = 'DELETED'`). To avoid false positives we
 * only reject when a mutating keyword appears at the START of the statement,
 * after stripping leading whitespace and leading SQL comments.
 */

const MUTATING_KEYWORDS = [
  "INSERT",
  "DELETE",
  "UPSERT",
  "REPLACE",
  "UPDATE",
  "MERGE",
] as const;

/** Strip leading whitespace and leading line (`--`) / block (`/* *\/`) comments. */
function stripLeadingNoise(query: string): string {
  let text = query;
  let changed = true;

  while (changed) {
    changed = false;
    const trimmed = text.replace(/^\s+/, "");
    if (trimmed !== text) {
      text = trimmed;
      changed = true;
    }
    // Leading line comment: -- ... up to end of line
    const lineComment = text.replace(/^--[^\n]*(\n|$)/, "");
    if (lineComment !== text) {
      text = lineComment;
      changed = true;
    }
    // Leading block comment: /* ... */
    const blockComment = text.replace(/^\/\*[\s\S]*?\*\//, "");
    if (blockComment !== text) {
      text = blockComment;
      changed = true;
    }
  }

  return text;
}

/** Returns true when the query is a mutating statement and must be rejected. */
export function isMutatingQuery(query: string): boolean {
  const normalized = stripLeadingNoise(query).toUpperCase();
  return MUTATING_KEYWORDS.some((keyword) =>
    new RegExp(`^${keyword}\\b`).test(normalized),
  );
}
