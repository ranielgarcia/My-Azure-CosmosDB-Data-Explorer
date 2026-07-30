import { useTabStore } from "@/store/tabStore";
import { TabHandle } from "./TabHandle";

export function TabBar() {
  const tabs = useTabStore((s) => s.tabs);

  return (
    <div className="flex shrink-0 items-stretch overflow-x-auto border-b bg-background">
      {tabs.map((tab) => (
        <TabHandle key={tab.id} tab={tab} />
      ))}
    </div>
  );
}
