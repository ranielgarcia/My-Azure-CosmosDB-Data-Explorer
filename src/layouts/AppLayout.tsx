import { PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { LeftPanel } from "./LeftPanel";
import { MainArea } from "./MainArea";
import { RightPanel } from "./RightPanel";
import { ResizeHandle } from "@/components/ResizeHandle";
import { Button } from "@/components/ui/button";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { useSelectedStorePersistence } from "@/hooks/useSelectedStorePersistence";
import { useLayoutStore } from "@/store/layoutStore";

export function AppLayout() {
  // Load the persisted tab session and keep it saved as it changes.
  useTabPersistence();
  // Load the persisted store selection and keep it saved as it changes.
  useSelectedStorePersistence();

  const sidebarWidth = useLayoutStore((s) => s.sidebarWidth);
  const setSidebarWidth = useLayoutStore((s) => s.setSidebarWidth);
  const resetSidebarWidth = useLayoutStore((s) => s.resetSidebarWidth);
  const leftPanelOpen = useLayoutStore((s) => s.leftPanelOpen);
  const setLeftPanelOpen = useLayoutStore((s) => s.setLeftPanelOpen);

  const savedQueriesOpen = useLayoutStore((s) => s.savedQueriesOpen);
  const setSavedQueriesOpen = useLayoutStore((s) => s.setSavedQueriesOpen);
  const rightSidebarWidth = useLayoutStore((s) => s.rightSidebarWidth);
  const setRightSidebarWidth = useLayoutStore((s) => s.setRightSidebarWidth);
  const resetRightSidebarWidth = useLayoutStore(
    (s) => s.resetRightSidebarWidth,
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {leftPanelOpen ? (
        <>
          <LeftPanel />
          <ResizeHandle
            orientation="vertical"
            ariaLabel="Resize sidebar"
            onDelta={(dx) => setSidebarWidth(sidebarWidth + dx)}
            onReset={resetSidebarWidth}
          />
        </>
      ) : (
        // Static rail (not an overlay) so it doesn't cover the first tab.
        <div className="flex w-10 shrink-0 flex-col items-center border-r border-border bg-sidebar py-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLeftPanelOpen(true)}
            title="Expand left panel"
            aria-label="Expand left panel"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        </div>
      )}
      <MainArea />
      {savedQueriesOpen ? (
        <>
          <ResizeHandle
            orientation="vertical"
            ariaLabel="Resize saved queries panel"
            // Dragging the handle left (negative dx) grows the right panel.
            onDelta={(dx) => setRightSidebarWidth(rightSidebarWidth - dx)}
            onReset={resetRightSidebarWidth}
          />
          <RightPanel />
        </>
      ) : (
        // Static rail (not an overlay) so it doesn't cover tab content.
        <div className="flex w-10 shrink-0 flex-col items-center border-l border-border bg-sidebar py-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSavedQueriesOpen(true)}
            title="Expand saved queries panel"
            aria-label="Expand saved queries panel"
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
