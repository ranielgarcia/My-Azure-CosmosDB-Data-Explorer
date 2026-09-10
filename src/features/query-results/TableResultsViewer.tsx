import { useEffect, useMemo, useRef } from "react";
import { MousePointerClick, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResizeHandle } from "@/components/ResizeHandle";
import {
  defaultResultColumns,
  discoverResultColumns,
  getResultCellValue,
  getResultItemKey,
} from "@/lib/queryResultTable";
import { cn } from "@/lib/utils";
import {
  DEFAULT_RESULT_DETAIL_WIDTH,
  MIN_RESULT_DETAIL_WIDTH,
  useLayoutStore,
} from "@/store/layoutStore";
import { useSelectedResultStore } from "@/store/selectedResultStore";
import { JsonViewer } from "./JsonViewer";
import { ResultColumnPicker } from "./ResultColumnPicker";

const MIN_RESULT_TABLE_WIDTH = 320;

interface TableResultsViewerProps {
  items: unknown[];
  tabId: string;
  subtabId: string;
  selectedColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

function formatCellValue(value: unknown): string {
  if (value === undefined) return "";
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function TableResultsViewer({
  items,
  tabId,
  subtabId,
  selectedColumns,
  onColumnsChange,
}: TableResultsViewerProps) {
  const selectedKey = useSelectedResultStore(
    (state) => state.selections[subtabId] ?? null,
  );
  const setSelection = useSelectedResultStore((state) => state.setSelection);
  const clearSelection = useSelectedResultStore(
    (state) => state.clearSelection,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const detailPaneRef = useRef<HTMLElement>(null);
  const resultDetailWidth = useLayoutStore((state) => state.resultDetailWidth);
  const setResultDetailWidth = useLayoutStore(
    (state) => state.setResultDetailWidth,
  );
  const availableColumns = useMemo(() => discoverResultColumns(items), [items]);
  const initialColumns = useMemo(
    () => defaultResultColumns(availableColumns),
    [availableColumns],
  );
  // Selection is keyed by the row's stable item key so it survives remounts on tab/subtab switches.
  const selectedRow = useMemo(() => {
    if (!selectedKey) return null;
    const index = items.findIndex(
      (item, itemIndex) => getResultItemKey(item, itemIndex) === selectedKey,
    );
    return index === -1 ? null : { index, item: items[index] };
  }, [items, selectedKey]);

  useEffect(() => {
    detailPaneRef.current?.style.setProperty(
      "--result-detail-width",
      `${resultDetailWidth}px`,
    );
  }, [resultDetailWidth]);

  const getMaxDetailWidth = () => {
    const containerWidth = containerRef.current?.clientWidth ?? 0;
    return Math.max(
      MIN_RESULT_DETAIL_WIDTH,
      containerWidth - MIN_RESULT_TABLE_WIDTH - 1,
    );
  };

  const resizeDetailPane = (delta: number) => {
    setResultDetailWidth(resultDetailWidth - delta, getMaxDetailWidth());
  };

  const resetDetailPane = () => {
    setResultDetailWidth(DEFAULT_RESULT_DETAIL_WIDTH, getMaxDetailWidth());
  };

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-w-0 overflow-hidden"
    >
      <section
        className="flex min-w-80 flex-1 flex-col"
        aria-label="Result rows"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/20 px-3 py-2">
          <span className="text-xs text-muted-foreground">
            {selectedColumns.length} column
            {selectedColumns.length === 1 ? "" : "s"}
          </span>
          <ResultColumnPicker
            availableColumns={availableColumns}
            selectedColumns={selectedColumns}
            defaultColumns={initialColumns}
            onChange={onColumnsChange}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-full table-fixed border-separate border-spacing-0 font-mono text-xs">
            <thead className="sticky top-0 z-10 bg-card">
              <tr>
                <th className="w-12 border-b border-r border-border px-3 py-2 text-right font-medium text-muted-foreground">
                  #
                </th>
                {selectedColumns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="w-56 border-b border-r border-border px-3 py-2 text-left font-semibold text-foreground last:border-r-0"
                  >
                    <span className="block truncate" title={column}>
                      {column}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const selected = selectedRow?.index === index;
                return (
                  <tr
                    key={index}
                    tabIndex={0}
                    onClick={() =>
                      setSelection(subtabId, getResultItemKey(item, index))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelection(subtabId, getResultItemKey(item, index));
                      }
                    }}
                    className={cn(
                      "cursor-pointer outline-none hover:bg-accent/60 focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      selected && "bg-accent",
                    )}
                  >
                    <td className="border-b border-r border-border px-3 py-2 text-right text-muted-foreground tabular-nums">
                      {index + 1}
                    </td>
                    {selectedColumns.map((column) => {
                      const text = formatCellValue(
                        getResultCellValue(item, column),
                      );
                      return (
                        <td
                          key={column}
                          className="max-w-56 border-b border-r border-border px-3 py-2 last:border-r-0"
                        >
                          <span className="block truncate" title={text}>
                            {text}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <ResizeHandle
        orientation="vertical"
        ariaLabel="Resize result table and selected item"
        onDelta={resizeDetailPane}
        onReset={resetDetailPane}
      />

      <aside
        ref={detailPaneRef}
        className={cn(
          "result-detail-pane flex w-(--result-detail-width) min-w-70 shrink-0 flex-col border-l border-border bg-background",
          !selectedRow && "result-detail-empty",
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
          <span className="text-xs font-semibold">Selected item</span>
          {selectedRow ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => clearSelection(subtabId)}
              aria-label="Close selected item"
              title="Close selected item"
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <div className="min-h-0 flex-1">
          {selectedRow ? (
            <JsonViewer data={selectedRow.item} tabId={tabId} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
              <MousePointerClick className="h-5 w-5 opacity-50" />
              <span className="text-xs">
                Select a row to inspect the full item.
              </span>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
