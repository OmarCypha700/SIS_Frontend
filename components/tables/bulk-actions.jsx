"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/forms/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/api";

/**
 * Floating bar shown while rows are selected, with the actions that can be applied to all of them.
 *
 * actions: [{ value, label, icon, destructive?, needsStatus?, confirm: (n) => string, done: (n) => string }]
 * The server applies each record separately and lists any it skipped (with the reason).
 */
export function BulkActions({ endpoint, selectedIds, onClear, onDone, actions, statusOptions = [], noun = "record" }) {
  const [active, setActive] = useState(null);
  const [result, setResult] = useState(null);
  const count = selectedIds.length;
  if (count === 0 && !result) return null;

  return (
    <>
      {count > 0 && (
        <div
          role="region"
          aria-label="Bulk actions"
          className="sticky bottom-4 z-30 mx-auto mt-4 flex w-fit max-w-full flex-wrap items-center gap-2 rounded-xl border bg-background/95 p-2 pl-4 shadow-lg backdrop-blur"
        >
          <span className="text-sm font-medium tabular-nums">
            {count} {noun}
            {count === 1 ? "" : "s"} selected
          </span>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X /> Clear
          </Button>
          <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.value}
                size="sm"
                variant={action.destructive ? "destructive" : "outline"}
                onClick={() => setActive(action)}
              >
                {Icon && <Icon />} {action.label}
              </Button>
            );
          })}
        </div>
      )}
      {active && (
        <BulkDialog
          action={active}
          endpoint={endpoint}
          ids={selectedIds}
          noun={noun}
          statusOptions={statusOptions}
          onClose={() => setActive(null)}
          onFinished={(outcome) => {
            setActive(null);
            if (outcome.done.length) toast.success(active.done(outcome.done.length));
            if (outcome.skipped.length) setResult({ action: active, outcome });
            // Keep only the skipped rows selected so they can be dealt with another way.
            onDone(outcome.skipped.map((s) => s.id));
          }}
        />
      )}
      {result && <SkippedDialog result={result} noun={noun} onClose={() => setResult(null)} />}
    </>
  );
}

function BulkDialog({ action, endpoint, ids, noun, statusOptions, onClose, onFinished }) {
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const ready = reason.trim() && (!action.needsStatus || status) && (!action.destructive || understood);

  async function submit() {
    setPending(true);
    setError("");
    try {
      const { data } = await api.post(endpoint, {
        action: action.value, ids, reason: reason.trim(), ...(action.needsStatus ? { status } : {}),
      });
      onFinished(data);
    } catch (e) {
      setError(errorMessage(e));
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action.label}</DialogTitle>
          <DialogDescription>{action.confirm(ids.length)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {action.needsStatus && (
            <div className="space-y-1.5">
              <Label htmlFor="bulk-status">
                New status<span className="text-destructive"> *</span>
              </Label>
              <NativeSelect id="bulk-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Choose…</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="bulk-reason">
              Reason<span className="text-destructive"> *</span>
            </Label>
            <Textarea id="bulk-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            <p className="text-xs text-muted-foreground">Recorded in the audit log for every {noun}.</p>
          </div>
          {action.destructive && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={understood} onCheckedChange={(v) => setUnderstood(v === true)} className="mt-0.5" />
              <span>
                I understand this permanently deletes these {noun}s. Any with registrations, results or other history will
                be skipped.
              </span>
            </label>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant={action.destructive ? "destructive" : "default"} onClick={submit} disabled={!ready || pending}>
            {pending && <Loader2 className="animate-spin" />}
            {action.label} ({ids.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SkippedDialog({ result, noun, onClose }) {
  const { action, outcome } = result;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {outcome.skipped.length} {noun}
            {outcome.skipped.length === 1 ? " was" : "s were"} skipped
          </DialogTitle>
          <DialogDescription>
            {outcome.done.length
              ? `${action.done(outcome.done.length)} The ${noun}s below were left unchanged and are still selected.`
              : `No ${noun}s were changed. The ${noun}s below are still selected.`}
          </DialogDescription>
        </DialogHeader>
        {outcome.done.length > 0 && (
          <Alert>
            <CheckCircle2 />
            <AlertTitle>{action.done(outcome.done.length)}</AlertTitle>
          </Alert>
        )}
        <ul className="max-h-72 divide-y overflow-y-auto rounded-md border text-sm">
          {outcome.skipped.map((item) => (
            <li key={item.id} className="px-3 py-2">
              <p className="font-medium">{item.label}</p>
              <p className="text-muted-foreground">{item.reason}</p>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
