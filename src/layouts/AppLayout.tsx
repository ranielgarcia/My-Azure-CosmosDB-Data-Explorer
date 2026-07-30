import { LeftPanel } from "./LeftPanel";
import { MainArea } from "./MainArea";
import { useTabPersistence } from "@/hooks/useTabPersistence";

export function AppLayout() {
  // Load the persisted tab session and keep it saved as it changes.
  useTabPersistence();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <LeftPanel />
      <MainArea />
    </div>
  );
}
