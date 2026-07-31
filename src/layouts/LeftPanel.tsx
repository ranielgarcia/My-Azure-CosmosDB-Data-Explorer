import { Database, RefreshCw, TriangleAlert } from "lucide-react";
import { useDatabases } from "@/hooks/useDatabases";
import { useRefreshStores } from "@/hooks/useRefreshStores";
import { DatabaseTree } from "@/features/databases/DatabaseTree";
import { StorePanel } from "@/features/stores/StorePanel";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  const refreshStores = useRefreshStores();

  const isRefreshing = isFetching || refreshStores.isPending;

  const handleRefresh = () => {
    refetch();
    refreshStores.mutate();
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <Database className="h-4 w-4" />
          </div>
          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-sm font-semibold tracking-tight">
              Cosmos Explorer
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              Data Explorer
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh databases & stores"
            aria-label="Refresh databases & stores"
          >
            <RefreshCw
              className={isRefreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
          </Button>
        </div>
      </div>

      <div className="px-3 pb-1 pt-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Databases
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {isLoading ? (
          <div className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground">
            <LoadingSpinner />
            Loading databases…
          </div>
        ) : isError ? (
          <div className="m-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <TriangleAlert className="h-4 w-4" />
              Failed to load databases
            </div>
            <p className="mb-2 text-xs break-words text-destructive/90">
              {(error as QueryError)?.message ?? "Unknown error"}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : databases && databases.length > 0 ? (
          <DatabaseTree databases={databases} />
        ) : (
          <p className="px-1 py-2 text-sm text-muted-foreground">
            No databases found.
          </p>
        )}
      </div>

      <div className="flex min-h-0 shrink-0 basis-1/2 flex-col border-t border-border">
        <StorePanel />
      </div>
    </aside>
  );
}
