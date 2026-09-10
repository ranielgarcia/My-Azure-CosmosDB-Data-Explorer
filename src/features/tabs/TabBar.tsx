import { useDroppable } from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import { useTabStore } from "@/store/tabStore";
import type { PaneState } from "@/types/tabs";
import { TabHandle } from "./TabHandle";

export function TabBar({ pane }: { pane: PaneState }) {
  const tabs = useTabStore((s) => s.tabs);
  const { setNodeRef, isOver } = useDroppable({
    id: `pane:${pane.id}`,
    data: { paneId: pane.id },
  });
  const paneTabs = pane.tabIds
    .map((tabId) => tabs.find((tab) => tab.id === tabId))
    .filter((tab) => tab !== undefined);

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-10 shrink-0 items-stretch gap-1 overflow-x-auto border-b border-border bg-sidebar px-1.5 pt-1.5 ${isOver ? "bg-accent/70" : ""}`}
    >
      <SortableContext
        items={pane.tabIds}
        strategy={horizontalListSortingStrategy}
      >
        {paneTabs.map((tab) => (
          <TabHandle
            key={tab.id}
            tab={tab}
            paneId={pane.id}
            isActive={pane.activeTabId === tab.id}
          />
        ))}
      </SortableContext>
    </div>
  );
}
