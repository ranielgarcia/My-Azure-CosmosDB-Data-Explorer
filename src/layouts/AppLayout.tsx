import { LeftPanel } from "./LeftPanel";
import { MainArea } from "./MainArea";
import { ResizeHandle } from "@/components/ResizeHandle";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { useLayoutStore } from "@/store/layoutStore";

export function AppLayout() {
  // Load the persisted tab session and keep it saved as it changes.
  useTabPersistence();

  const sidebarWidth = useLayoutStore((s) => s.sidebarWidth);
  const setSidebarWidth = useLayoutStore((s) => s.setSidebarWidth);
  const resetSidebarWidth = useLayoutStore((s) => s.resetSidebarWidth);

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
    </div>
  );
}
