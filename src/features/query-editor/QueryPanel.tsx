import { useState, useEffect, useMemo, useRef } from "react";
import { useTabStore } from "@/store/tabStore";
import { useExecuteQuery } from "@/hooks/useExecuteQuery";
import type { TabState } from "@/types/tabs";
import { extractDocumentFields } from "@/lib/queryFields";
import { QueryEditor } from "./QueryEditor";
import { ExecuteButton } from "./ExecuteButton";
import { ResultsPanel } from "@/features/query-results/ResultsPanel";
import { ResizeHandle } from "@/components/ResizeHandle";
import { MIN_QUERY_EDITOR_HEIGHT, useLayoutStore } from "@/store/layoutStore";

export function QueryPanel({ tab }: { tab: TabState }) {
  const updateQuery = useTabStore((s) => s.updateQuery);
  const { runQuery, loadMore, isPending } = useExecuteQuery();
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const containerRef = useRef<HTMLDivElement>(null);

  const queryEditorHeight = useLayoutStore((s) => s.queryEditorHeight);
  const setQueryEditorHeight = useLayoutStore((s) => s.setQueryEditorHeight);
  const resetQueryEditorHeight = useLayoutStore(
    (s) => s.resetQueryEditorHeight,
  );

  const handleEditorDelta = (dy: number) => {
    const containerHeight = containerRef.current?.clientHeight ?? 600;
    const max = containerHeight - MIN_QUERY_EDITOR_HEIGHT;
    setQueryEditorHeight(queryEditorHeight + dy, max);
  };

  useEffect(() => {
    setCursor({ line: 1, col: 1 });
  }, [tab.id]);

  const fields = useMemo(
    () => extractDocumentFields(tab.results?.items ?? []),
    [tab.results],
  );

  const hasQuery = tab.query.trim().length > 0;
  const results = tab.results;

  return (
    <div
      ref={containerRef}
      className="flex flex-1 flex-col overflow-hidden bg-background"
    >
      {/* Editor toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card/50 px-4 py-2.5">
        <span className="truncate font-mono text-xs text-muted-foreground">
          {tab.label}
        </span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground/60 tabular-nums">
            Ln {cursor.line}, Col {cursor.col}
          </span>
          <ExecuteButton
            onExecute={() => runQuery(tab)}
            isLoading={isPending}
            disabled={!hasQuery}
          />
        </div>
      </div>

      {/* Editor — resizable height */}
      <div
        style={{ height: queryEditorHeight }}
        className="shrink-0 border-b border-border"
      >
        <QueryEditor
          value={tab.query}
          onChange={(value) => updateQuery(tab.id, value)}
          onRun={() => runQuery(tab)}
          onCursorChange={(line, col) => setCursor({ line, col })}
          fields={fields}
        />
      </div>

      <ResizeHandle
        orientation="horizontal"
        ariaLabel="Resize query editor"
        onDelta={handleEditorDelta}
        onReset={resetQueryEditorHeight}
      />

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
