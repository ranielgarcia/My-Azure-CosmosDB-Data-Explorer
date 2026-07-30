import { TriangleAlert } from "lucide-react";
import { useContainers } from "@/hooks/useContainers";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import type { QueryError } from "@/types/cosmos";
import { ContainerItemRow } from "./ContainerItem";

export function ContainerList({ dbId }: { dbId: string }) {
  const { data: containers, isLoading, isError, error } = useContainers(dbId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-1.5 pl-9 text-xs text-muted-foreground">
        <LoadingSpinner className="h-3 w-3" />
        Loading…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-1.5 py-1.5 pl-9 pr-2 text-xs text-destructive">
        <TriangleAlert className="h-3 w-3 shrink-0" />
        <span className="truncate">
          {(error as QueryError)?.message ?? "Failed to load"}
        </span>
      </div>
    );
  }

  if (!containers || containers.length === 0) {
    return (
      <p className="py-1.5 pl-9 text-xs text-muted-foreground">No containers</p>
    );
  }

  return (
    <ul>
      {containers.map((container) => (
        <ContainerItemRow
          key={container.id}
          dbId={dbId}
          container={container}
        />
      ))}
    </ul>
  );
}
