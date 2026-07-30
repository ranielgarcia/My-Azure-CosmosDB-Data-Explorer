import { Database, RefreshCw, TriangleAlert } from "lucide-react";
import { useDatabases } from "@/hooks/useDatabases";
import { DatabaseTree } from "@/features/databases/DatabaseTree";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import type { QueryError } from "@/types/cosmos";

export function LeftPanel() {
  const {
    data: databases,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useDatabases();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-background">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold">Cosmos Explorer</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
          title="Refresh databases"
        >
          <RefreshCw
            className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"}
          />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {isLoading ? (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
            <LoadingSpinner />
            Loading databases…
          </div>
        ) : isError ? (
          <div className="m-3 rounded-md border border-destructive/50 p-3 text-sm text-destructive">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <TriangleAlert className="h-4 w-4" />
              Failed to load databases
            </div>
            <p className="mb-2 text-xs break-words">
              {(error as QueryError)?.message ?? "Unknown error"}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : databases && databases.length > 0 ? (
          <DatabaseTree databases={databases} />
        ) : (
          <p className="px-3 py-2 text-sm text-muted-foreground">
            No databases found.
          </p>
        )}
      </div>
    </aside>
  );
}
