import { Database } from "lucide-react";
import { useTabStore } from "@/store/tabStore";
import { TabBar } from "@/features/tabs/TabBar";
import { TabContent } from "@/features/tabs/TabContent";
import { EmptyState } from "@/components/EmptyState";

export function MainArea() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {tabs.length > 0 ? (
        <>
          <TabBar />
          <TabContent key={activeTabId} />
        </>
      ) : (
        <EmptyState
          icon={<Database className="h-8 w-8 opacity-40" />}
          title="No container open"
          description="Select a container from the left to open a query tab."
        />
      )}
    </main>
  );
}
