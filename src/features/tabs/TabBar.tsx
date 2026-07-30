import { useTabStore } from "@/store/tabStore";
import { TabHandle } from "./TabHandle";

export function TabBar() {
  const tabs = useTabStore((s) => s.tabs);

  return (
    <div className="flex shrink-0 items-stretch gap-1 overflow-x-auto border-b border-border bg-sidebar px-1.5 pt-1.5">
      {tabs.map((tab) => (
        <TabHandle key={tab.id} tab={tab} />
      ))}
    </div>
  );
}
