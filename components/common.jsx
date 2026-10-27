"use client";

import { useState } from "react";
import { AlertCircle, Inbox, Loader2, ShieldAlert } from "lucide-react";

import { hasRole, useAuth } from "@/components/auth/auth-provider";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/api";
import { titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, className }) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const STATUS_STYLES = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  blue: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  amber: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  red: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  violet: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300",
  gray: "border-border bg-muted text-muted-foreground",
};

const STATUS_COLORS = {
  ACTIVE: "green", REGISTERED: "green", PUBLISHED: "green", APPLIED: "green", OPEN: "green", GRADUATED: "violet",
  COMPLETED: "violet", APPROVED: "blue", SUBMITTED: "blue", PENDING: "amber", RETURNED: "amber", DEFERRED: "amber",
  PLANNED: "gray", DRAFT: "gray", CLOSED: "gray", DROPPED: "gray", APPLICANT: "gray", SUSPENDED: "red",
  WITHDRAWN: "red", REJECTED: "red", CANCELLED: "red", DISMISSED: "red", DISMISS: "red", PROBATION: "amber",
  GOOD: "green", ELIGIBLE: "amber", NOT_TAKEN: "gray", PROMOTE: "green", REPEAT: "amber", STAY: "gray",
};

export function StatusBadge({ status, label, className }) {
  if (!status) return null;
  const color = STATUS_COLORS[status] || "gray";
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_STYLES[color], className)}>
      {label || titleCase(status)}
    </Badge>
  );
}

export function EmptyState({ icon: Icon = Inbox, title = "Nothing here yet", description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-12 text-center", className)}>
      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-12 text-center", className)}>
      <AlertCircle className="size-6 text-destructive" />
      <p className="font-medium">{errorMessage(error, "This information could not be loaded.")}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function LoadingBlock({ rows = 4, className }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, className }) {
  return (
    <Card className={cn("gap-0 py-4", className)}>
      <CardContent className="px-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          {Icon && <Icon className="size-4 text-muted-foreground" />}
        </div>
        <p className="mt-2 text-2xl font-semibold tabular-nums">{value ?? "—"}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/** Client-side role check for page rendering. The API enforces the same rules. */
export function RoleGate({ roles, children }) {
  const { user } = useAuth();
  if (!hasRole(user, ...roles)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="You do not have access to this page"
        description="If you believe this is a mistake, contact your institution administrator."
      />
    );
  }
  return children;
}

/**
 * Confirmation dialog for sensitive actions. With `requireReason`, a reason must be
 * entered and is passed to onConfirm(reason).
 */
export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel = "Confirm", destructive = false, requireReason = false,
  reasonLabel = "Reason", reasonOptional = false, onConfirm,
}) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const needsReason = requireReason && !reasonOptional;

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onOpenChange(false);
    } catch {
      // the caller reports errors; keep the dialog open so the user can retry
    } finally {
      setPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {requireReason && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-reason">
              {reasonLabel}
              {needsReason && <span className="text-destructive"> *</span>}
            </Label>
            <Textarea id="confirm-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending || (needsReason && !reason.trim())}
            onClick={handleConfirm}
          >
            {pending && <Loader2 className="animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DescriptionList({ items, className }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4 sm:grid-cols-2", className)}>
      {items.map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
          <dd className="mt-1 break-words text-sm">{value === null || value === undefined || value === "" ? "—" : value}</dd>
        </div>
      ))}
    </dl>
  );
}
