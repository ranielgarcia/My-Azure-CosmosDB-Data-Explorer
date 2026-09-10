import type { StockroomZone } from "@/types/stockroomZones";

const GUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Leave one of Azure Table's 15 filter comparisons for `IsDeleted eq false`.
export const STOCKROOM_ZONE_ID_BATCH_SIZE = 14;

export function normalizeZoneId(zoneId: string): string {
  return zoneId.toLowerCase();
}

export function collectZoneIds(data: unknown): string[] {
  const ids = new Set<string>();
  const pending: unknown[] = [data];
  const visited = new WeakSet<object>();

  while (pending.length > 0) {
    const value = pending.pop();
    if (typeof value !== "object" || value === null || visited.has(value)) {
      continue;
    }
    visited.add(value);

    if (Array.isArray(value)) {
      pending.push(...value);
      continue;
    }

    for (const [key, child] of Object.entries(value)) {
      if (key === "zoneId" && typeof child === "string" && GUID.test(child)) {
        ids.add(normalizeZoneId(child));
      } else if (typeof child === "object" && child !== null) {
        pending.push(child);
      }
    }
  }

  return [...ids].sort();
}

export function buildZoneLabels(
  zones: readonly StockroomZone[],
): ReadonlyMap<string, string> {
  return new Map(
    zones.map((zone) => [
      normalizeZoneId(zone.Id),
      `${zone.ZoneName} (${zone.TpcGroup})`,
    ]),
  );
}

export function batchZoneIds(zoneIds: readonly string[]): string[][] {
  const batches: string[][] = [];
  for (
    let index = 0;
    index < zoneIds.length;
    index += STOCKROOM_ZONE_ID_BATCH_SIZE
  ) {
    batches.push(zoneIds.slice(index, index + STOCKROOM_ZONE_ID_BATCH_SIZE));
  }
  return batches;
}
