import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTabStore } from "@/store/tabStore";
import type { SubtabState, TabState } from "@/types/tabs";

function SubtabHandle({ tab, subtab }: { tab: TabState; subtab: SubtabState }) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(subtab.name);
  const setActiveSubtab = useTabStore((state) => state.setActiveSubtab);
  const renameSubtab = useTabStore((state) => state.renameSubtab);
  const closeSubtab = useTabStore((state) => state.closeSubtab);
  const isActive = tab.activeSubtabId === subtab.id;

  const finishRename = () => {
    if (!renameSubtab(tab.id, subtab.id, draftName)) {
      setDraftName(subtab.name);
    }
    setIsRenaming(false);
  };

  return (
    <div
      className={cn(
        "group flex h-8 max-w-48 shrink-0 items-center border-r border-border text-xs",
        isActive
          ? "bg-background text-foreground"
          : "bg-muted/30 text-muted-foreground hover:bg-accent/60",
      )}
    >
      {isRenaming ? (
        <input
          autoFocus
          value={draftName}
          maxLength={80}
          aria-label={`Rename ${subtab.name}`}
          className="mx-1 min-w-0 flex-1 rounded-sm border border-primary bg-background px-1.5 py-0.5 outline-none"
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={finishRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") finishRename();
            if (event.key === "Escape") {
              setDraftName(subtab.name);
              setIsRenaming(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="min-w-0 flex-1 truncate py-2 pl-3 pr-1 text-left"
          aria-current={isActive ? "page" : undefined}
          title={`${subtab.name} (double-click to rename)`}
          onClick={() => setActiveSubtab(tab.id, subtab.id)}
          onDoubleClick={() => {
            setDraftName(subtab.name);
            setIsRenaming(true);
          }}
        >
          {subtab.name}
        </button>
      )}
      <button
        type="button"
        disabled={tab.subtabs.length === 1}
        onClick={() => closeSubtab(tab.id, subtab.id)}
        className="mr-1 rounded-sm p-0.5 opacity-50 hover:bg-accent hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-20"
        title={
          tab.subtabs.length === 1
            ? "At least one query is required"
            : "Close query"
        }
        aria-label={`Close ${subtab.name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function SubtabBar({ tab }: { tab: TabState }) {
  const addSubtab = useTabStore((state) => state.addSubtab);

  return (
    <div className="flex h-9 shrink-0 items-center overflow-x-auto border-b border-border bg-muted/20">
      {tab.subtabs.map((subtab) => (
        <SubtabHandle key={subtab.id} tab={tab} subtab={subtab} />
      ))}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 rounded-none"
        onClick={() => addSubtab(tab.id)}
        title="Add query subtab"
        aria-label="Add query subtab"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
