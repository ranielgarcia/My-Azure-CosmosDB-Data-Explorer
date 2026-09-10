export const SCALAR_RESULT_COLUMN = "value";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Returns top-level result fields in stable first-seen order. */
export function discoverResultColumns(items: unknown[]): string[] {
  const columns = new Set<string>();

  for (const item of items) {
    if (isRecord(item)) {
      for (const key of Object.keys(item)) {
        columns.add(key);
      }
    } else {
      columns.add(SCALAR_RESULT_COLUMN);
    }
  }

  return Array.from(columns);
}

/** Defaults to `id` plus the first other field, or just the first field. */
export function defaultResultColumns(availableColumns: string[]): string[] {
  const firstNonId = availableColumns.find((column) => column !== "id");

  if (availableColumns.includes("id")) {
    return firstNonId ? ["id", firstNonId] : ["id"];
  }

  return availableColumns.slice(0, 1);
}

export function getResultCellValue(item: unknown, column: string): unknown {
  if (isRecord(item)) return item[column];
  return column === SCALAR_RESULT_COLUMN ? item : undefined;
}

/** Stable identity for a result row: the document `id` when present, else its position. */
export function getResultItemKey(item: unknown, index: number): string {
  if (
    isRecord(item) &&
    (typeof item.id === "string" || typeof item.id === "number")
  ) {
    return `id:${item.id}`;
  }
  return `idx:${index}`;
}
