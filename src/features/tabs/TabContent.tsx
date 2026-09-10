import { selectWorkspace, useTabStore } from "@/store/tabStore";
import { QueryPanel } from "@/features/query-editor/QueryPanel";
import { SubtabBar } from "./SubtabBar";

export function TabContent({ tabId }: { tabId: string }) {
  const tabs = useTabStore((state) => state.tabs);
  const activeTab = tabs.find((tab) => tab.id === tabId) ?? null;
  const workspace = selectWorkspace(tabs, tabId);

  if (!activeTab || !workspace) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SubtabBar tab={activeTab} />
      <QueryPanel key={workspace.id} tab={workspace} />
    </div>
  );
}
