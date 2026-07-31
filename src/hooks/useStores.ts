import { useQuery } from "@tanstack/react-query";
import { fetchStores } from "@/services/tables";

export function useStores() {
  return useQuery({
    queryKey: ["stores"],
    queryFn: fetchStores,
    staleTime: 60_000,
  });
}
