import { Save } from "lucide-react";
import { useSaveQuery } from "@/hooks/useSavedQueries";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import type { TabState } from "@/types/tabs";

interface SaveQueryButtonProps {
  tab: TabState;
}

export function SaveQueryButton({ tab }: SaveQueryButtonProps) {
  const saveMutation = useSaveQuery();
  const query = tab.query.trim();
  const disabled = query.length === 0 || saveMutation.isPending;

  const handleSave = () => {
    if (query.length === 0) return;
    const name = window.prompt("Name this query:")?.trim();
    if (!name) return;
    saveMutation.mutate({
      databaseId: tab.databaseId,
      containerId: tab.containerId,
      name,
      query,
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSave}
      disabled={disabled}
      title="Save the current query"
    >
      {saveMutation.isPending ? (
        <LoadingSpinner />
      ) : (
        <Save className="h-3.5 w-3.5" />
      )}
      Save
    </Button>
  );
}
