import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
      {icon}
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="text-xs">{description}</p> : null}
    </div>
  );
}
