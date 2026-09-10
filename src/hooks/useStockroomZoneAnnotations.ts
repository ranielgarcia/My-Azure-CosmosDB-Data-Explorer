import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  fetchStockroomZonesByIds,
  fetchStockroomZonesByPartitionKeys,
} from "@/services/tables";
import { useSelectedStoreStore } from "@/store/selectedStoreStore";
import type { QueryError } from "@/types/cosmos";
import type { StockroomZone } from "@/types/stockroomZones";
import { STOCKROOM_TAB_ID } from "@/features/query-results/kleene-monaco-data-annotations/containers/stockroom";
import {
  batchZoneIds,
  buildZoneLabels,
  collectZoneIds,
  normalizeZoneId,
} from "@/features/query-results/kleene-monaco-data-annotations/stockroomZoneAnnotations";

const ZONE_STALE_TIME = 5 * 60_000;

function mergeZones(
  batches: readonly (StockroomZone[] | undefined)[],
): StockroomZone[] {
  const byId = new Map<string, StockroomZone>();
  for (const zones of batches) {
    for (const zone of zones ?? []) {
      byId.set(normalizeZoneId(zone.Id), zone);
    }
  }
  return [...byId.values()];
}

function asQueryError(error: unknown): QueryError | null {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return null;
  }
  const code =
    "code" in error && typeof error.code === "number" ? error.code : undefined;
  return { message: String(error.message), code };
}

export function useStockroomZoneAnnotations(data: unknown, tabId: string) {
  const selectedStoreId = useSelectedStoreStore(
    (state) => state.selectedStoreId,
  );
  const hydrated = useSelectedStoreStore((state) => state.hydrated);
  const isStockroomTab = tabId === STOCKROOM_TAB_ID;
  const zoneIds = useMemo(
    () => (isStockroomTab ? collectZoneIds(data) : []),
    [data, isStockroomTab],
  );
  const idBatches = useMemo(() => batchZoneIds(zoneIds), [zoneIds]);
  const useStoreLookup = hydrated && isStockroomTab && Boolean(selectedStoreId);
  const useIdLookup = hydrated && isStockroomTab && !selectedStoreId;

  const storeQuery = useQuery({
    queryKey: ["stockroom-zones", "by-store", selectedStoreId],
    queryFn: ({ signal }) =>
      fetchStockroomZonesByPartitionKeys([selectedStoreId!], signal),
    enabled: useStoreLookup,
    staleTime: ZONE_STALE_TIME,
  });

  const idQueries = useQueries({
    queries: idBatches.map((ids) => ({
      queryKey: ["stockroom-zones", "by-ids", ids],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchStockroomZonesByIds(ids, signal),
      enabled: useIdLookup,
      staleTime: ZONE_STALE_TIME,
    })),
  });

  const zones = useMemo(
    () =>
      useStoreLookup
        ? (storeQuery.data ?? [])
        : mergeZones(idQueries.map((query) => query.data)),
    [idQueries, storeQuery.data, useStoreLookup],
  );
  const labelsByZoneId = useMemo(() => buildZoneLabels(zones), [zones]);
  const error = useStoreLookup
    ? asQueryError(storeQuery.error)
    : asQueryError(idQueries.find((query) => query.error)?.error);

  return {
    labelsByZoneId,
    isFetching: useStoreLookup
      ? storeQuery.isFetching
      : idQueries.some((query) => query.isFetching),
    error,
    refetch: () =>
      useStoreLookup
        ? storeQuery.refetch()
        : Promise.all(idQueries.map((query) => query.refetch())),
  };
}
