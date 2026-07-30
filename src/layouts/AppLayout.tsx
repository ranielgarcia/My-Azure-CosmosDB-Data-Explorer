import { LeftPanel } from "./LeftPanel";
import { MainArea } from "./MainArea";

export function AppLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <LeftPanel />
      <MainArea />
    </div>
  );
}
