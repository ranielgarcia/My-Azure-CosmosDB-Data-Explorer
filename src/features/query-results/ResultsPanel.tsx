import { Play } from "lucide-react";
import type { TabState } from "@/types/tabs";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "./ErrorBanner";
import { JsonViewer } from "./JsonViewer";

interface ResultsPanelProps {
  tab: TabState;
  onLoadMore: () => void;
  isLoadingMore: boolean;
}

export function ResultsPanel({
  tab,
  onLoadMore,
  isLoadingMore,
}: ResultsPanelProps) {
  const { results, error, isLoading } = tab;

  // Fresh run in progress (no results yet).
  if (isLoading && !results) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <LoadingSpinner />
        Running query…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-auto">
        <ErrorBanner error={error} />
      </div>
    );
  }

  if (!results) {
    return (
      <EmptyState
        icon={<Play className="h-6 w-6 opacity-40" />}
        title="Run a query to see results"
        description="Press Execute or Ctrl+Enter."
      />
    );
  }

  if (results.count === 0) {
    return (
      <EmptyState
        title="No documents matched"
        description="The query returned 0 items."
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1">
        <JsonViewer data={results.items} />
      </div>
      {results.continuationToken ? (
        <div className="flex shrink-0 justify-center border-t border-border bg-muted/30 py-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? <LoadingSpinner /> : null}
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
