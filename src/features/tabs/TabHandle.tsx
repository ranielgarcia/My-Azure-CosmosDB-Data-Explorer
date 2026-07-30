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
        "group flex max-w-[16rem] items-center rounded-t-md border border-b-0 text-sm transition-colors",
        isActive
          ? "border-border bg-background text-foreground shadow-sm"
          : "border-transparent bg-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <button
        type="button"
        aria-current={isActive ? "page" : undefined}
        onClick={() => setActiveTab(tab.id)}
        className="max-w-52 truncate py-2 pl-3 pr-1 text-left font-medium"
        title={tab.label}
      >
        {tab.label}
      </button>
      <button
        type="button"
        onClick={() => closeTab(tab.id)}
        className="mr-1.5 rounded-md p-0.5 text-muted-foreground opacity-60 transition-opacity hover:bg-accent hover:opacity-100"
        title="Close tab"
        aria-label={`Close ${tab.label}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
