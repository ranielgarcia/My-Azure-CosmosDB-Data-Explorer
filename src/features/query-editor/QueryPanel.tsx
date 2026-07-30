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
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="font-mono text-xs text-muted-foreground">
          {tab.label}
        </span>
        <ExecuteButton
          onExecute={() => runQuery(tab)}
          isLoading={isPending}
          disabled={!hasQuery}
        />
      </div>

      {/* Editor */}
      <div className="h-40 shrink-0 border-b">
        <QueryEditor
          value={tab.query}
          onChange={(value) => updateQuery(tab.id, value)}
          onRun={() => runQuery(tab)}
        />
      </div>

      {/* Status bar */}
      {results ? (
        <div className="flex shrink-0 items-center gap-4 border-b bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
          <span>
            {results.count} item{results.count === 1 ? "" : "s"} loaded
          </span>
          <span>{results.requestCharge.toFixed(2)} RU</span>
          {results.continuationToken ? (
            <span>more available</span>
          ) : (
            <span>complete</span>
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
