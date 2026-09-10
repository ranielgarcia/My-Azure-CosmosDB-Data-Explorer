import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  Check,
  Copy,
  PanelRightClose,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { selectWorkspace, useTabStore } from "@/store/tabStore";
import { useDeleteSavedQuery, useSavedQueries } from "@/hooks/useSavedQueries";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { useLayoutStore } from "@/store/layoutStore";
import type { QueryError } from "@/types/cosmos";

export function SavedQueriesPanel() {
  const tabs = useTabStore((s) => s.tabs);
  const panes = useTabStore((s) => s.panes);
  const activePaneId = useTabStore((s) => s.activePaneId);
  const setSavedQueriesOpen = useLayoutStore((s) => s.setSavedQueriesOpen);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeTabId =
    panes.find((pane) => pane.id === activePaneId)?.activeTabId ?? "";
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const workspace = selectWorkspace(tabs, activeTabId);
  const databaseId = workspace?.databaseId ?? null;
  const containerId = workspace?.containerId ?? null;

  // Avoid a stale filter hiding all queries after switching containers.
  useEffect(() => {
    setSearch("");
  }, [databaseId, containerId]);

  const {
    data: queries,
    isLoading,
    isError,
    error,
  } = useSavedQueries(databaseId, containerId);
  const deleteQuery = useDeleteSavedQuery(databaseId, containerId);

  const filteredQueries = useMemo(() => {
    if (!queries) return [];
    const q = search.trim().toLowerCase();
    if (!q) return queries;
    return queries.filter((query) => query.name.toLowerCase().includes(q));
  }, [queries, search]);

  const handleCopy = async (id: string, query: string) => {
    try {
      await navigator.clipboard.writeText(query);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Ignore copy failures (permissions / unsupported environment).
    }
  };

  return (
    <aside className="flex min-h-0 flex-col border-l border-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSavedQueriesOpen(false)}
          title="Collapse saved queries panel"
          aria-label="Collapse saved queries panel"
        >
          <PanelRightClose className="h-4 w-4" />
        </Button>
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
          <>
            <div className="mb-2 flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search saved queries…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {filteredQueries.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">
                No saved queries match &quot;{search}&quot;.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {filteredQueries.map((q) => (
                  <li key={q.id} className="group">
                    <div className="flex items-center gap-1 rounded-md hover:bg-accent">
                      <div
                        title={q.query}
                        className="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left"
                      >
                        <span className="w-full truncate text-sm font-medium text-foreground/90">
                          {q.name}
                        </span>
                        <span className="w-full truncate font-mono text-[11px] text-muted-foreground">
                          {q.query}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => void handleCopy(q.id, q.query)}
                        title="Copy query"
                        aria-label={`Copy saved query ${q.name}`}
                      >
                        {copiedId === q.id ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
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
            )}
          </>
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
