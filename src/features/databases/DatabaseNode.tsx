import { ChevronDown, ChevronRight, Database } from "lucide-react";
import { useExplorerStore } from "@/store/explorerStore";
import type { DatabaseItem } from "@/types/cosmos";
import { ContainerList } from "@/features/collections/ContainerList";

export function DatabaseNode({ database }: { database: DatabaseItem }) {
  const expanded = useExplorerStore((s) =>
    s.expandedDatabases.has(database.id),
  );
  const toggleDatabase = useExplorerStore((s) => s.toggleDatabase);

  return (
    <li>
      <button
        type="button"
        onClick={() => toggleDatabase(database.id)}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{database.id}</span>
      </button>

      {expanded ? <ContainerList dbId={database.id} /> : null}
    </li>
  );
}
