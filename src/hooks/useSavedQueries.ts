import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteSavedQuery,
  fetchSavedQueries,
  saveQuery,
} from "@/services/savedQueries";
import type { NewSavedQuery } from "@/types/savedQuery";

/** List saved queries for a database/container. Idle until both ids are set. */
export function useSavedQueries(
  databaseId: string | null,
  containerId: string | null,
) {
  return useQuery({
    queryKey: ["saved-queries", databaseId, containerId],
    queryFn: () => fetchSavedQueries(databaseId!, containerId!),
    enabled: Boolean(databaseId && containerId),
    staleTime: 60_000,
  });
}

/** Persist a new saved query, then refresh the matching list. */
export function useSaveQuery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewSavedQuery) => saveQuery(input),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({
        queryKey: ["saved-queries", saved.databaseId, saved.containerId],
      });
    },
  });
}

/** Delete a saved query, then refresh the affected list. */
export function useDeleteSavedQuery(
  databaseId: string | null,
  containerId: string | null,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSavedQuery(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["saved-queries", databaseId, containerId],
      });
    },
  });
}
