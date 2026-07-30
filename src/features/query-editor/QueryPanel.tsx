import { useTabStore } from "@/store/tabStore";
import { useExecuteQuery } from "@/hooks/useExecuteQuery";
import type { TabState } from "@/types/tabs";
import { QueryEditor } from "./QueryEditor";
import { ExecuteButton } from "./ExecuteButton";
import { ResultsPanel } from "@/features/query-results/ResultsPanel";

export function QueryPanel({ tab }: { tab: TabState }) {
  const updateQuery = useTabStore((s) => s.updateQuery);
  const { runQuery, loadMore, isPending } = useExecuteQuery();

  const hasQuery = tab.query.trim().length > 0;
  const results = tab.results;

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card/50 px-4 py-2.5">
        <span className="truncate font-mono text-xs text-muted-foreground">
          {tab.label}
        </span>
        <ExecuteButton
          onExecute={() => runQuery(tab)}
          isLoading={isPending}
          disabled={!hasQuery}
        />
      </div>

      {/* Editor */}
      <div className="h-40 shrink-0 border-b border-border">
        <QueryEditor
          value={tab.query}
          onChange={(value) => updateQuery(tab.id, value)}
          onRun={() => runQuery(tab)}
        />
      </div>

      {/* Status bar */}
      {results ? (
        <div className="flex shrink-0 items-center gap-4 border-b border-border bg-muted/40 px-4 py-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">
            {results.count} item{results.count === 1 ? "" : "s"} loaded
          </span>
          <span className="font-mono">
            {results.requestCharge.toFixed(2)} RU
          </span>
          {results.continuationToken ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500/80" />
              more available
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
              complete
            </span>
          )}
        </div>
      ) : null}

      {/* Results */}
      <ResultsPanel
        tab={tab}
        onLoadMore={() => loadMore(tab)}
        isLoadingMore={isPending}
      />
    </div>
  );
}
