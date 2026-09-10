import { useQuery } from "@tanstack/react-query";
import { fetchStockroomZonesByPartitionKeys } from "@/services/tables";
import type { QueryError } from "@/types/cosmos";

const ZONE_STALE_TIME = 5 * 60_000;

function asQueryError(error: unknown): QueryError | null {
  if (typeof error !== "object" || error === null || !("message" in error)) {
    return null;
  }
  const code =
    "code" in error && typeof error.code === "number" ? error.code : undefined;
  return { message: String(error.message), code };
}

/** Stockroom zones for a single store, for display (not annotation/tab-scoped). */
export function useStockroomZonesByStore(storeId: string | undefined) {
  const query = useQuery({
    queryKey: ["stockroom-zones", "by-store", storeId],
    queryFn: ({ signal }) =>
      fetchStockroomZonesByPartitionKeys([storeId!], signal),
    enabled: Boolean(storeId),
    staleTime: ZONE_STALE_TIME,
  });

  return {
    zones: query.data ?? [],
    isLoading: query.isLoading,
    error: asQueryError(query.error),
  };
}
