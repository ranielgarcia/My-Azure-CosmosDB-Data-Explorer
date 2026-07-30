import { useQuery } from "@tanstack/react-query";
import { fetchDatabases } from "@/services/cosmos";

export function useDatabases() {
  return useQuery({
    queryKey: ["databases"],
    queryFn: fetchDatabases,
    staleTime: 30_000,
  });
}
