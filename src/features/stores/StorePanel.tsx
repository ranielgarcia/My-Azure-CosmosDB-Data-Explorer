import { useEffect } from "react";
import { Store, TriangleAlert } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { useSelectedStoreStore } from "@/store/selectedStoreStore";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StoreSelect } from "./StoreSelect";
import { StoreDetailsCard } from "./StoreDetailsCard";
import type { QueryError } from "@/types/cosmos";

export function StorePanel() {
  const selectedStoreId = useSelectedStoreStore((s) => s.selectedStoreId);
  const setSelectedStoreId = useSelectedStoreStore((s) => s.setSelectedStoreId);
  const setTimeZone = useSelectedStoreStore((s) => s.setTimeZone);
  const { data: store, isLoading, isError, error } = useStore(selectedStoreId);

  // Share the selected store's time zone globally so other features (e.g. the
  // JSON results viewer) can localise UTC dates. Clear it when no store is
  // resolved so annotations only appear for a valid selection.
  useEffect(() => {
    setTimeZone(store?.TimeZone ?? null);
  }, [store?.TimeZone, setTimeZone]);

  return (
    <div className="flex min-h-0 flex-col">
      <div className="px-3 pb-1 pt-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Store Details
        </span>
      </div>

      <div className="px-2 pb-3">
        <StoreSelect
          selectedStoreId={selectedStoreId}
          onSelect={setSelectedStoreId}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {!selectedStoreId ? (
          <div className="flex flex-col items-center gap-2 px-2 py-6 text-center text-muted-foreground">
            <Store className="h-6 w-6" />
            <p className="text-xs">Select a store to view its details.</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground">
            <LoadingSpinner />
            Loading store…
          </div>
        ) : isError ? (
          <div className="m-1 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <TriangleAlert className="h-4 w-4" />
              Failed to load store
            </div>
            <p className="text-xs break-words text-destructive/90">
              {(error as QueryError)?.message ?? "Unknown error"}
            </p>
          </div>
        ) : store ? (
          <StoreDetailsCard store={store} />
        ) : null}
      </div>
    </div>
  );
}
