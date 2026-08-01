import { Bookmark, Trash2, TriangleAlert } from "lucide-react";
import { useTabStore } from "@/store/tabStore";
import { useDeleteSavedQuery, useSavedQueries } from "@/hooks/useSavedQueries";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import type { QueryError } from "@/types/cosmos";

export function SavedQueriesPanel() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const updateQuery = useTabStore((s) => s.updateQuery);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;
  const databaseId = activeTab?.databaseId ?? null;
  const containerId = activeTab?.containerId ?? null;

  const {
    data: queries,
    isLoading,
    isError,
    error,
  } = useSavedQueries(databaseId, containerId);
  const deleteQuery = useDeleteSavedQuery(databaseId, containerId);

  return (
    <aside className="flex min-h-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Bookmark className="h-4 w-4 text-muted-foreground" />
        <div className="min-w-0 leading-tight">
          <h2 className="truncate text-sm font-semibold tracking-tight">
            Saved Queries
          </h2>
          <p className="truncate text-[11px] text-muted-foreground">
            {activeTab ? activeTab.label : "No container open"}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {!activeTab ? (
          <div className="flex flex-col items-center gap-2 px-2 py-6 text-center text-muted-foreground">
            <Bookmark className="h-6 w-6 opacity-50" />
            <p className="text-xs">
              Open a container tab to see its saved queries.
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground">
            <LoadingSpinner />
            Loading…
          </div>
        ) : isError ? (
          <div className="m-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <TriangleAlert className="h-4 w-4" />
              Failed to load
            </div>
            <p className="text-xs break-words text-destructive/90">
              {(error as QueryError)?.message ?? "Unknown error"}
            </p>
          </div>
        ) : queries && queries.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {queries.map((q) => (
              <li key={q.id} className="group">
                <div className="flex items-center gap-1 rounded-md hover:bg-accent">
                  <button
                    type="button"
                    onClick={() => updateQuery(activeTab.id, q.query)}
                    title={q.query}
                    className="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left"
                  >
                    <span className="w-full truncate text-sm font-medium text-foreground/90">
                      {q.name}
                    </span>
                    <span className="w-full truncate font-mono text-[11px] text-muted-foreground">
                      {q.query}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mr-1 h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    onClick={() => deleteQuery.mutate(q.id)}
                    disabled={deleteQuery.isPending}
                    title="Delete saved query"
                    aria-label={`Delete saved query ${q.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-2 px-2 py-6 text-center text-muted-foreground">
            <Bookmark className="h-6 w-6 opacity-50" />
            <p className="text-xs">
              No saved queries yet. Use{" "}
              <span className="font-medium text-foreground/80">Save</span> in
              the editor toolbar to add one.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
