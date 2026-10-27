"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Label + control + help text + error message, with accessible wiring. */
export function Field({ id, label, required, error, hint, className, children }) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && (
            <span className="text-destructive" aria-hidden="true">
              {" "}*
            </span>
          )}
        </Label>
      )}
      {typeof children === "function" ? children({ id, "aria-invalid": Boolean(error) || undefined, "aria-describedby": describedBy }) : children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Native select styled like the other inputs; reliable inside forms and dialogs. */
export function NativeSelect({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30 [&>option]:bg-background",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
