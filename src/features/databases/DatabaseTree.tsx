import type { DatabaseItem } from "@/types/cosmos";
import { DatabaseNode } from "./DatabaseNode";

export function DatabaseTree({ databases }: { databases: DatabaseItem[] }) {
  return (
    <ul className="select-none space-y-0.5">
      {databases.map((db) => (
        <DatabaseNode key={db.id} database={db} />
      ))}
    </ul>
  );
}
