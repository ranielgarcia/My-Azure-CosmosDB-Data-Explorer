import * as React from "react";
import { cn } from "@/lib/utils";

const variantClasses = {
  default: "bg-card text-foreground",
  destructive:
    "border-destructive/40 bg-destructive/5 text-destructive [&>svg]:text-destructive",
} as const;

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantClasses;
  ref?: React.Ref<HTMLDivElement>;
}

export function Alert({
  className,
  variant = "default",
  ref,
  ...props
}: AlertProps) {
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:pl-7",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export function AlertTitle({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & {
  ref?: React.Ref<HTMLParagraphElement>;
}) {
  return (
    <h5
      ref={ref}
      className={cn("mb-1 font-medium leading-none tracking-tight", className)}
      {...props}
    />
  );
}

export function AlertDescription({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  ref?: React.Ref<HTMLParagraphElement>;
}) {
  return (
    <div
      ref={ref}
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}
