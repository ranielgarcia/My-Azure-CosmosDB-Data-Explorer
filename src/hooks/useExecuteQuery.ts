import { useMutation } from "@tanstack/react-query";
import { executeQuery } from "@/services/cosmos";
import { useSelectedResultStore } from "@/store/selectedResultStore";
import { useTabStore } from "@/store/tabStore";
import type { QueryError } from "@/types/cosmos";
import type { QueryWorkspaceState } from "@/types/tabs";

const PAGE_SIZE = 100;

interface RunVariables {
  tab: QueryWorkspaceState;
  mode: "replace" | "append";
  overrideQuery?: string;
}

export function useExecuteQuery() {
  const setTabLoading = useTabStore((s) => s.setTabLoading);
  const setTabError = useTabStore((s) => s.setTabError);
  const applyQueryResult = useTabStore((s) => s.applyQueryResult);

  const mutation = useMutation({
    mutationFn: ({ tab, mode, overrideQuery }: RunVariables) => {
      const continuationToken =
        mode === "append"
          ? (tab.results?.continuationToken ?? undefined)
          : undefined;
      return executeQuery(
        tab.databaseId,
        tab.containerId,
        overrideQuery ?? tab.query,
        PAGE_SIZE,
        continuationToken,
      );
    },
    onMutate: ({ tab }) => {
      setTabLoading(tab.id, true);
    },
    onSuccess: (result, { tab, mode }) => {
      applyQueryResult(tab.id, result, mode);
      // A fresh run invalidates any previously selected row; "load more" keeps it.
      if (mode === "replace") {
        useSelectedResultStore.getState().clearSelection(tab.id);
      }
    },
    onError: (error, { tab }) => {
      const queryError = error as QueryError;
      setTabError(tab.id, {
        message: queryError.message ?? "Query failed.",
        code: queryError.code,
      });
    },
  });

  return {
    runQuery: (tab: QueryWorkspaceState, overrideQuery?: string) =>
      mutation.mutate({ tab, mode: "replace", overrideQuery }),
    loadMore: (tab: QueryWorkspaceState, overrideQuery?: string) =>
      mutation.mutate({ tab, mode: "append", overrideQuery }),
    isPending: mutation.isPending,
  };
}
