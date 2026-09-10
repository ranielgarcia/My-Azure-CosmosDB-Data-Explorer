import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Columns3, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ResultColumnPickerProps {
  availableColumns: string[];
  selectedColumns: string[];
  defaultColumns: string[];
  onChange: (columns: string[]) => void;
}

export function ResultColumnPicker({
  availableColumns,
  selectedColumns,
  defaultColumns,
  onChange,
}: ResultColumnPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const columns = useMemo(
    () => Array.from(new Set([...selectedColumns, ...availableColumns])),
    [availableColumns, selectedColumns],
  );
  const filteredColumns = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase();
    return normalized
      ? columns.filter((column) =>
          column.toLocaleLowerCase().includes(normalized),
        )
      : columns;
  }, [columns, search]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    inputRef.current?.focus();

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const toggleColumn = (column: string) => {
    if (selectedColumns.includes(column)) {
      if (selectedColumns.length === 1) return;
      onChange(selectedColumns.filter((candidate) => candidate !== column));
    } else {
      onChange([...selectedColumns, column]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((value) => !value)}
        disabled={availableColumns.length === 0}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Choose table columns"
      >
        <Columns3 className="h-3.5 w-3.5" />
        Columns
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-label="Table columns"
          className="absolute right-0 z-30 mt-1 w-64 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
        >
          <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              ref={inputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search columns"
              aria-label="Search columns"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filteredColumns.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No matching columns.
              </p>
            ) : (
              filteredColumns.map((column) => {
                const selected = selectedColumns.includes(column);
                const disabled = selected && selectedColumns.length === 1;
                return (
                  <label
                    key={column}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-sm hover:bg-accent",
                      disabled && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => toggleColumn(column)}
                      className="peer sr-only"
                    />
                    <span
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border border-input peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-popover",
                        selected &&
                          "border-primary bg-primary text-primary-foreground",
                      )}
                      aria-hidden="true"
                    >
                      {selected ? <Check className="h-3 w-3" /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-mono text-xs">
                      {column}
                    </span>
                  </label>
                );
              })
            )}
          </div>
          <div className="border-t border-border p-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => onChange(defaultColumns)}
              disabled={defaultColumns.length === 0}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset columns
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
