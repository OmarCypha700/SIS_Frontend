import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * A fees account, oldest first, with the running balance. One row per entry, readable on a phone.
 * `actions(line)` can add a control per line (staff: Reverse).
 */
export function FeeStatement({ lines, actions }) {
  if (!lines.length) {
    return <p className="px-4 py-6 text-center text-sm text-muted-foreground">No fees or payments yet.</p>;
  }
  return (
    <ul className="divide-y text-sm">
      {lines.map((line) => {
        const credit = Number(line.amount) < 0;
        return (
          <li key={line.id} className={cn("flex items-start gap-3 px-4 py-3", line.reversed && "text-muted-foreground")}>
            <div className="min-w-0 flex-1">
              <p className={cn(line.reversed && "line-through")}>{line.description}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDate(line.date)} · {line.kind_display}
                {line.period ? ` · ${line.period}` : ""}
                {line.receipt_number ? ` · ${line.receipt_number}` : ""}
              </p>
              {line.reversed && <Badge variant="secondary" className="mt-1">Reversed</Badge>}
              {actions?.(line)}
            </div>
            <div className="shrink-0 text-right tabular-nums">
              <p className={cn("font-medium", credit && "text-emerald-600 dark:text-emerald-400")}>
                {credit ? "− " : ""}
                {formatMoney(Math.abs(Number(line.amount)))}
              </p>
              <p className="text-xs text-muted-foreground">Balance {formatMoney(line.balance)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** The registration rule for the current period, explained in plain words. */
export function RequirementSummary({ summary }) {
  if (!summary?.billed) return null;
  const earlier = Number(summary.earlier_balance) > 0;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted-foreground">Paid towards this period</span>
        <span className="font-medium tabular-nums">{summary.percent_paid ?? 0}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div
          className={cn("h-full rounded-full", summary.meets ? "bg-emerald-500" : "bg-amber-500")}
          style={{ width: `${Math.min(summary.percent_paid ?? 0, 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {summary.percent_required}% of this period&apos;s fees{earlier ? " and all earlier balances" : ""} must be paid to
        register.
      </p>
    </div>
  );
}
