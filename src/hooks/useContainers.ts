import { useQuery } from "@tanstack/react-query";
import { fetchContainers } from "@/services/cosmos";

export function useContainers(dbId: string | null) {
  return useQuery({
    queryKey: ["containers", dbId],
    queryFn: () => fetchContainers(dbId!),
    enabled: !!dbId,
  });
}
