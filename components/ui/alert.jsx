import * as React from "react"
import { cva } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils"

/**
 * Notices, coloured by meaning (the same colours as status badges and dashboard icons):
 * info (blue, the default) for guidance, warning (amber) for something to act on or be aware of,
 * success (green) for something done, destructive (red) for something blocked or failed.
 * Each type has its own icon too, so it can be told apart without relying on colour.
 */
const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-lg border px-3 py-2.5 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        info:
          "border-sky-200 bg-sky-50 text-sky-950 *:[svg]:text-sky-600 *:data-[slot=alert-description]:text-sky-950/75 dark:border-sky-900/70 dark:bg-sky-950/40 dark:text-sky-50 dark:*:[svg]:text-sky-400 dark:*:data-[slot=alert-description]:text-sky-50/75",
        warning:
          "border-amber-300 bg-amber-50 text-amber-950 *:[svg]:text-amber-600 *:data-[slot=alert-description]:text-amber-950/80 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-50 dark:*:[svg]:text-amber-400 dark:*:data-[slot=alert-description]:text-amber-50/80",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-950 *:[svg]:text-emerald-600 *:data-[slot=alert-description]:text-emerald-950/75 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-50 dark:*:[svg]:text-emerald-400 dark:*:data-[slot=alert-description]:text-emerald-50/75",
        destructive:
          "border-red-200 bg-red-50 text-red-950 *:[svg]:text-red-600 *:data-[slot=alert-description]:text-red-950/80 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-50 dark:*:[svg]:text-red-400 dark:*:data-[slot=alert-description]:text-red-50/80",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
)

const DEFAULT_ICONS = { info: Info, warning: AlertTriangle, success: CheckCircle2, destructive: XCircle };

function Alert({
  className,
  variant = "info",
  icon,
  children,
  ...props
}) {
  // A page can pass its own icon as the first child; otherwise the type's icon is shown.
  // `icon={false}` leaves it out.
  const hasOwnIcon = React.Children.toArray(children).some(
    (child) => React.isValidElement(child) && ![AlertTitle, AlertDescription, AlertAction].includes(child.type)
      && typeof child.type !== "string"
  );
  const Icon = icon === false || hasOwnIcon ? null : DEFAULT_ICONS[variant] || Info;
  return (
    <div
      data-slot="alert"
      data-variant={variant}
      // Only errors interrupt a screen reader; other notices are read in turn.
      role={variant === "destructive" ? "alert" : "status"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </div>
  )
}

function AlertTitle({
  className,
  ...props
}) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:opacity-80",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm text-balance group-has-[>svg]/alert:col-start-2 md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:opacity-80 [&_p:not(:last-child)]:mb-4",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({
  className,
  ...props
}) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2 right-2", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
