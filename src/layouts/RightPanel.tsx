import { SavedQueriesPanel } from "@/features/saved-queries/SavedQueriesPanel";
import { useLayoutStore } from "@/store/layoutStore";

export function RightPanel() {
  const rightSidebarWidth = useLayoutStore((s) => s.rightSidebarWidth);

  return (
    <div
      style={{ width: rightSidebarWidth }}
      className="flex shrink-0 flex-col overflow-hidden"
    >
      <SavedQueriesPanel />
    </div>
  );
}
