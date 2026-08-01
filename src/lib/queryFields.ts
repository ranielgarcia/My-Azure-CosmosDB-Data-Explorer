/**
 * System properties Cosmos DB attaches to every document. They are noise in
 * autocomplete, so we hide them — except `id`, which users query frequently.
 */
const SYSTEM_PROPS = new Set(["_rid", "_self", "_etag", "_attachments", "_ts"]);

/** Guards against pathologically deep documents when flattening nested paths. */
const MAX_DEPTH = 6;

function collectPaths(
  value: unknown,
  prefix: string,
  depth: number,
  out: Set<string>,
): void {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    depth > MAX_DEPTH
  ) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    // Only Cosmos system properties at the document root are hidden.
    if (prefix === "" && SYSTEM_PROPS.has(key)) {
      continue;
    }

    const path = prefix ? `${prefix}.${key}` : key;
    out.add(path);
    collectPaths(child, path, depth + 1, out);
  }
}

/**
 * Derives a sorted, de-duplicated list of property paths from a set of result
 * documents. Nested objects are flattened into dotted paths (e.g. `address`,
 * `address.city`); arrays and primitives are treated as leaves. Non-object
 * entries and Cosmos system properties (at the root) are ignored. Feeds
 * schema-aware IntelliSense in the query editor.
 */
export function extractDocumentFields(items: unknown[]): string[] {
  const fields = new Set<string>();

  for (const item of items) {
    collectPaths(item, "", 0, fields);
  }

  return Array.from(fields).sort((a, b) => a.localeCompare(b));
}

/**
 * Given the flattened dotted property paths for a document and a parent path,
 * returns the immediate child property names. An empty `parentPath` yields the
 * top-level fields. Example: paths `["address", "address.city"]` with
 * `parentPath` `"address"` returns `["city"]`.
 */
export function childFieldNames(paths: string[], parentPath: string): string[] {
  const children = new Set<string>();

  if (parentPath === "") {
    for (const path of paths) {
      if (!path.includes(".")) {
        children.add(path);
      }
    }
  } else {
    const prefix = `${parentPath}.`;
    for (const path of paths) {
      if (path.startsWith(prefix)) {
        const rest = path.slice(prefix.length);
        if (rest && !rest.includes(".")) {
          children.add(rest);
        }
      }
    }
  }

  return Array.from(children);
}
