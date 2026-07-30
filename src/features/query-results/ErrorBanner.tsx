import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { QueryError } from "@/types/cosmos";

export function ErrorBanner({ error }: { error: QueryError }) {
  return (
    <Alert variant="destructive" className="m-4">
      <TriangleAlert className="h-4 w-4" />
      <div>
        <AlertTitle>
          Query failed{error.code ? ` (HTTP ${error.code})` : ""}
        </AlertTitle>
        <AlertDescription className="break-words">
          {error.message}
        </AlertDescription>
      </div>
    </Alert>
  );
}
