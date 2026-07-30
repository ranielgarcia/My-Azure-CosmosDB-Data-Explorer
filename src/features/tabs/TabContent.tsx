import { useTabStore } from "@/store/tabStore";
import { QueryPanel } from "@/features/query-editor/QueryPanel";

export function TabContent() {
  const activeTab = useTabStore(
    (s) => s.tabs.find((tab) => tab.id === s.activeTabId) ?? null,
  );

  if (!activeTab) return null;

  return <QueryPanel tab={activeTab} />;
}
