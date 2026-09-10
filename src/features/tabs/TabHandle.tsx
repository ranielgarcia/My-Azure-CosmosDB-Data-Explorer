import { PanelLeft, PanelRight, X } from "lucide-react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { MAX_PANES, useTabStore } from "@/store/tabStore";
import type { TabState } from "@/types/tabs";

export function TabHandle({
  tab,
  paneId,
  isActive,
}: {
  tab: TabState;
  paneId: string;
  isActive: boolean;
}) {
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const splitTab = useTabStore((s) => s.splitTab);
  const canSplit = useTabStore((s) => s.panes.length < MAX_PANES);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id, data: { paneId } });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex max-w-[16rem] shrink-0 items-center rounded-t-md border border-b-0 text-sm transition-colors",
        isActive
          ? "border-border bg-background text-foreground shadow-sm"
          : "border-transparent bg-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground",
        isDragging && "opacity-40",
      )}
    >
      <button
        type="button"
        aria-current={isActive ? "page" : undefined}
        onClick={() => setActiveTab(paneId, tab.id)}
        className="max-w-52 truncate py-2 pl-3 pr-1 text-left font-medium"
        title={tab.label}
        {...attributes}
        {...listeners}
      >
        {tab.label}
      </button>
      <button
        type="button"
        disabled={!canSplit}
        onClick={(event) => {
          event.stopPropagation();
          splitTab(tab.id, "left");
        }}
        className="rounded-sm p-0.5 text-muted-foreground opacity-0 hover:bg-accent hover:text-foreground group-hover:opacity-60 focus-visible:opacity-100 disabled:hidden"
        title="Move to new pane on left"
        aria-label={`Move ${tab.label} to a new pane on the left`}
      >
        <PanelLeft className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        disabled={!canSplit}
        onClick={(event) => {
          event.stopPropagation();
          splitTab(tab.id, "right");
        }}
        className="rounded-sm p-0.5 text-muted-foreground opacity-0 hover:bg-accent hover:text-foreground group-hover:opacity-60 focus-visible:opacity-100 disabled:hidden"
        title="Move to new pane on right"
        aria-label={`Move ${tab.label} to a new pane on the right`}
      >
        <PanelRight className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          closeTab(tab.id);
        }}
        className="mr-1.5 rounded-md p-0.5 text-muted-foreground opacity-60 transition-opacity hover:bg-accent hover:opacity-100"
        title="Close tab"
        aria-label={`Close ${tab.label}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
