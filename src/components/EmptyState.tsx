import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
      {icon ? (
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/40">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-medium text-foreground/80">{title}</p>
      {description ? (
        <p className="max-w-xs text-xs leading-relaxed">{description}</p>
      ) : null}
    </div>
  );
}
