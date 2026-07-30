import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface ExecuteButtonProps {
  onExecute: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ExecuteButton({
  onExecute,
  isLoading,
  disabled,
}: ExecuteButtonProps) {
  return (
    <Button size="sm" onClick={onExecute} disabled={disabled || isLoading}>
      {isLoading ? <LoadingSpinner /> : <Play className="h-3.5 w-3.5" />}
      Execute
    </Button>
  );
}
