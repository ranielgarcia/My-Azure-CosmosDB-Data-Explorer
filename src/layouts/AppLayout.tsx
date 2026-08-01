import { LeftPanel } from "./LeftPanel";
import { MainArea } from "./MainArea";
import { RightPanel } from "./RightPanel";
import { ResizeHandle } from "@/components/ResizeHandle";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { useLayoutStore } from "@/store/layoutStore";

export function AppLayout() {
  // Load the persisted tab session and keep it saved as it changes.
  useTabPersistence();

  const sidebarWidth = useLayoutStore((s) => s.sidebarWidth);
  const setSidebarWidth = useLayoutStore((s) => s.setSidebarWidth);
  const resetSidebarWidth = useLayoutStore((s) => s.resetSidebarWidth);

  const savedQueriesOpen = useLayoutStore((s) => s.savedQueriesOpen);
  const rightSidebarWidth = useLayoutStore((s) => s.rightSidebarWidth);
  const setRightSidebarWidth = useLayoutStore((s) => s.setRightSidebarWidth);
  const resetRightSidebarWidth = useLayoutStore(
    (s) => s.resetRightSidebarWidth,
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <LeftPanel />
      <ResizeHandle
        orientation="vertical"
        ariaLabel="Resize sidebar"
        onDelta={(dx) => setSidebarWidth(sidebarWidth + dx)}
        onReset={resetSidebarWidth}
      />
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
      ) : null}
    </div>
  );
}
