import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Database, PanelLeft, PanelRight } from "lucide-react";
import { MAX_PANES, useTabStore } from "@/store/tabStore";
import { TabBar } from "@/features/tabs/TabBar";
import { TabContent } from "@/features/tabs/TabContent";
import { EmptyState } from "@/components/EmptyState";
import { ResizeHandle } from "@/components/ResizeHandle";
import { cn } from "@/lib/utils";

const MIN_PANE_WIDTH = 320;

function SplitDropZone({ edge }: { edge: "left" | "right" }) {
  const { setNodeRef, isOver } = useDroppable({ id: `split:${edge}` });
  const Icon = edge === "left" ? PanelLeft : PanelRight;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "pointer-events-auto absolute inset-y-3 z-30 flex w-14 items-center justify-center border border-primary/50 bg-background/90 text-primary shadow-lg",
        edge === "left" ? "left-3" : "right-3",
        isOver && "w-20 bg-primary text-primary-foreground",
      )}
      aria-label={`Create pane on the ${edge}`}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

export function MainArea() {
  const containerRef = useRef<HTMLElement>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const tabs = useTabStore((s) => s.tabs);
  const panes = useTabStore((s) => s.panes);
  const setActivePane = useTabStore((s) => s.setActivePane);
  const moveTab = useTabStore((s) => s.moveTab);
  const splitTab = useTabStore((s) => s.splitTab);
  const setPaneWidths = useTabStore((s) => s.setPaneWidths);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    setDraggedTabId(String(active.id));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggedTabId(null);
    if (!over) return;
    const tabId = String(active.id);
    const overId = String(over.id);
    if (overId === "split:left" || overId === "split:right") {
      splitTab(tabId, overId.endsWith("left") ? "left" : "right");
      return;
    }
    const targetPaneId = over.data.current?.paneId as string | undefined;
    if (!targetPaneId) return;
    const targetPane = panes.find((pane) => pane.id === targetPaneId);
    if (!targetPane) return;
    const overIndex = targetPane.tabIds.indexOf(overId);
    moveTab(
      tabId,
      targetPaneId,
      overIndex === -1 ? targetPane.tabIds.length : overIndex,
    );
  };

  const resizePanes = (leftIndex: number, delta: number) => {
    const width = containerRef.current?.clientWidth ?? 0;
    if (width <= 0) return;
    const left = panes[leftIndex];
    const right = panes[leftIndex + 1];
    const pairWidth = (left.width + right.width) * width;
    if (pairWidth < MIN_PANE_WIDTH * 2) return;
    const leftWidth = Math.min(
      Math.max(left.width * width + delta, MIN_PANE_WIDTH),
      pairWidth - MIN_PANE_WIDTH,
    );
    setPaneWidths({
      [left.id]: leftWidth / width,
      [right.id]: (pairWidth - leftWidth) / width,
    });
  };

  const draggedTab = tabs.find((tab) => tab.id === draggedTabId);

  return (
    <main
      ref={containerRef}
      className="relative flex min-w-0 flex-1 justify-center overflow-hidden bg-background"
    >
      {tabs.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragCancel={() => setDraggedTabId(null)}
          onDragEnd={handleDragEnd}
          accessibility={{
            screenReaderInstructions: {
              draggable:
                "Press space to pick up a database tab, arrow keys to move it, and space to drop.",
            },
          }}
        >
          <div className="flex min-w-0 flex-1 overflow-x-auto">
            {panes.map((pane, index) => (
              <div key={pane.id} className="contents">
                {index > 0 ? (
                  <ResizeHandle
                    orientation="vertical"
                    ariaLabel={`Resize pane ${index} and pane ${index + 1}`}
                    onDelta={(delta) => resizePanes(index - 1, delta)}
                  />
                ) : null}
                <section
                  style={{ width: `${pane.width * 100}%` }}
                  className="query-pane flex min-w-80 shrink-0 flex-col overflow-hidden"
                  aria-label={`Query pane ${index + 1}`}
                  onPointerDown={() => setActivePane(pane.id)}
                >
                  <TabBar pane={pane} />
                  <TabContent key={pane.activeTabId} tabId={pane.activeTabId} />
                </section>
              </div>
            ))}
          </div>
          {draggedTabId && panes.length < MAX_PANES ? (
            <>
              <SplitDropZone edge="left" />
              <SplitDropZone edge="right" />
            </>
          ) : null}
          <DragOverlay>
            {draggedTab ? (
              <div className="max-w-64 truncate rounded-md border border-primary bg-background px-3 py-2 text-sm font-medium shadow-xl">
                {draggedTab.label}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <EmptyState
          icon={<Database className="h-8 w-8 opacity-40" />}
          title="No container open"
          description="Select a container from the left to open a query tab."
        />
      )}
    </main>
  );
}
