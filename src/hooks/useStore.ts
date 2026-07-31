import { useQuery } from "@tanstack/react-query";
import { fetchStore } from "@/services/tables";

export function useStore(rowKey: string | null) {
  const partitionKey = "SiteLocation";
  return useQuery({
    queryKey: ["store", partitionKey, rowKey],
    queryFn: () => fetchStore(partitionKey!, rowKey!),
    enabled: Boolean(partitionKey) && Boolean(rowKey),
    staleTime: 60_000,
  });
}
