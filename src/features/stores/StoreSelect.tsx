import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronsUpDown,
  Search,
  Store,
  TriangleAlert,
} from "lucide-react";
import { useStores } from "@/hooks/useStores";
import { cn } from "@/lib/utils";
import type { QueryError } from "@/types/cosmos";

interface StoreSelectProps {
  selectedStoreId: string | null;
  onSelect: (storeId: string) => void;
}

export function StoreSelect({ selectedStoreId, onSelect }: StoreSelectProps) {
  const { data: stores, isLoading, isError, error } = useStores();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedStore = useMemo(
    () => stores?.find((s) => s.StoreId === selectedStoreId) ?? null,
    [stores, selectedStoreId],
  );

  const filtered = useMemo(() => {
    if (!stores) return [];
    const q = search.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(
      (s) =>
        s.StoreName.toLowerCase().includes(q) ||
        s.StoreId.toLowerCase().includes(q),
    );
  }, [stores, search]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      setSearch("");
      inputRef.current?.focus();
    }
  }, [open]);

  if (isError) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-2.5 py-2 text-xs text-destructive">
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
        <span className="break-words">
          {(error as QueryError)?.message ?? "Failed to load stores"}
        </span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isLoading}
        className={cn(
          "flex w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2 text-left text-sm",
          "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60",
        )}
      >
        <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            !selectedStore && "text-muted-foreground",
          )}
        >
          {isLoading
            ? "Loading stores…"
            : selectedStore
              ? `${selectedStore.StoreName} (${selectedStore.StoreId})`
              : "Select a store…"}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && !isLoading ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search stores…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">
                No stores match “{search}”.
              </p>
            ) : (
              filtered.map((store) => {
                const isSelected = store.StoreId === selectedStoreId;
                return (
                  <button
                    key={store.StoreId}
                    type="button"
                    onClick={() => {
                      onSelect(store.StoreId);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-accent",
                      isSelected && "bg-accent/60",
                    )}
                  >
                    <Check
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {store.StoreName}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {store.StoreId}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
