import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabStore } from "@/store/tabStore";
import type { TabState } from "@/types/tabs";

export function TabHandle({ tab }: { tab: TabState }) {
  const isActive = useTabStore((s) => s.activeTabId === tab.id);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const closeTab = useTabStore((s) => s.closeTab);

  return (
    <div
      className={cn(
        "group flex max-w-[16rem] items-center border-r border-b-2 text-sm",
        isActive
          ? "border-b-primary bg-background text-foreground"
          : "border-b-transparent text-muted-foreground hover:bg-accent/50",
      )}
    >
      <button
        type="button"
        aria-current={isActive ? "page" : undefined}
        onClick={() => setActiveTab(tab.id)}
        className="max-w-52 truncate py-2 pl-3 pr-1 text-left"
        title={tab.label}
      >
        {tab.label}
      </button>
      <button
        type="button"
        onClick={() => closeTab(tab.id)}
        className="mr-1.5 rounded p-0.5 text-muted-foreground opacity-60 hover:bg-accent hover:opacity-100"
        title="Close tab"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
