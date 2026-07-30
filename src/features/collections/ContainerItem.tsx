import { Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { useExplorerStore } from "@/store/explorerStore";
import { useTabStore } from "@/store/tabStore";
import type { ContainerItem } from "@/types/cosmos";

interface ContainerItemRowProps {
  dbId: string;
  container: ContainerItem;
}

export function ContainerItemRow({ dbId, container }: ContainerItemRowProps) {
  const openTab = useTabStore((s) => s.openTab);
  const selectContainer = useExplorerStore((s) => s.selectContainer);
  const isSelected = useExplorerStore(
    (s) =>
      s.selectedDatabaseId === dbId && s.selectedContainerId === container.id,
  );

  const handleClick = () => {
    selectContainer(dbId, container.id);
    openTab(dbId, container.id);
  };

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        title={
          container.partitionKeyPath
            ? `Partition key: ${container.partitionKeyPath}`
            : undefined
        }
        className={cn(
          "relative flex w-full items-center gap-1.5 rounded-md py-1.5 pl-8 pr-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
          isSelected
            ? "bg-accent font-medium text-accent-foreground before:absolute before:left-2 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary"
            : "text-muted-foreground",
        )}
      >
        <Box className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{container.id}</span>
      </button>
    </li>
  );
}
