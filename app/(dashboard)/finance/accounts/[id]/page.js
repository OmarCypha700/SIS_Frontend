"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { BadgeCheck, HandCoins, Loader2, Receipt, SlidersHorizontal, Undo2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { ErrorState, LoadingBlock, PageHeader, RoleGate, StatCard, StatusBadge } from "@/components/common";
import { PdfButton } from "@/components/export-menu";
import { FeeStatement, RequirementSummary } from "@/components/fees/fee-statement";
import { Field, NativeSelect } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import { formatDateTime, formatMoney } from "@/lib/format";

const METHODS = [["bank", "Bank deposit"], ["cash", "Cash"], ["mobile_money", "Mobile money"], ["bank_transfer", "Bank transfer"], ["cheque", "Cheque"]];

export default function StudentAccountPage() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/student-accounts/${id}/`);
  const [dialog, setDialog] = useState(null);
  const [reversing, setReversing] = useState(null);
  const done = () => {
    setDialog(null);
    setReversing(null);
    reload();
  };

  return (
    <RoleGate roles={["ADMIN", "ACCOUNTS_OFFICER"]}>
      {loading && !data && <LoadingBlock rows={6} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <>
          <PageHeader
            title={data.student.full_name}
            description={`${data.student.student_number} · ${data.student.programme_code} · ${data.student.level}`}
            actions={
              <>
                <PdfButton url={`/student-accounts/${id}/statement-pdf/`} filename={`statement-${data.student.student_number}.pdf`}
                           label="Statement" variant="outline" />
                <Button variant="outline" onClick={() => setDialog("entry")}>
                  <SlidersHorizontal /> Waiver or adjustment
                </Button>
                <Button onClick={() => setDialog("payment")}>
                  <HandCoins /> Record payment
                </Button>
              </>
            }
          />
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              <StatCard label="Balance owed" value={formatMoney(data.summary.balance)} icon={Wallet}
                        tone={Number(data.summary.balance) > 0 ? "amber" : "green"} className="col-span-2 lg:col-span-1" />
              <StatCard label="To pay to register" value={data.summary.billed ? formatMoney(data.summary.short_by) : "—"}
                        hint={data.summary.billed ? (data.summary.meets ? "Meets the rule" : `${data.summary.percent_required}% rule`) : "Not billed this period"}
                        icon={BadgeCheck} tone={data.summary.meets ? "green" : "brand"} />
              <StatCard label="This period's fees" value={data.summary.billed ? formatMoney(data.summary.current_bill) : "—"}
                        hint={data.summary.billed ? `${data.summary.percent_paid ?? 0}% paid` : undefined} icon={Receipt} tone="blue" />
            </div>
            {data.summary.billed && (
              <Card>
                <CardContent>
                  <RequirementSummary summary={data.summary} />
                </CardContent>
              </Card>
            )}
            <div className="grid gap-6 lg:grid-cols-5">
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Statement</CardTitle>
                  <CardDescription>Entries are never edited. Reverse one made in error; both stay on the statement.</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  <FeeStatement
                    lines={data.statement}
                    actions={(line) =>
                      !line.reversed && !line.is_reversal && (
                        <Button variant="link" size="sm" className="mt-1 h-auto p-0 text-xs" onClick={() => setReversing(line)}>
                          <Undo2 /> Reverse
                        </Button>
                      )
                    }
                  />
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Payments</CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  {data.payments.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">No payments yet.</p>
                  ) : (
                    <ul className="divide-y text-sm">
                      {data.payments.map((p) => (
                        <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium tabular-nums">{formatMoney(p.amount)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(p.paid_at || p.created_at)} · {p.source_display}
                              {p.receipt_number ? ` · ${p.receipt_number}` : ""}
                            </p>
                            {p.status !== "SUCCESS" && <StatusBadge status={p.status === "PENDING" ? "PENDING" : "REJECTED"} label={p.status_display} />}
                          </div>
                          {p.status === "SUCCESS" && (
                            <PdfButton url={`/payments/${p.id}/receipt/`} filename={`receipt-${p.receipt_number}.pdf`} label="Receipt" variant="outline" size="sm" />
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          {dialog === "payment" && <PaymentDialog studentId={id} onClose={() => setDialog(null)} onDone={done} />}
          {dialog === "entry" && <EntryDialog studentId={id} onClose={() => setDialog(null)} onDone={done} />}
          {reversing && <ReverseDialog studentId={id} line={reversing} onClose={() => setReversing(null)} onDone={done} />}
        </>
      )}
    </RoleGate>
  );
}

function useSubmit(onDone) {
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState({});
  async function submit(request, message) {
    setPending(true);
    setErrors({});
    try {
      await request();
      toast.success(message);
      onDone();
    } catch (e) {
      setErrors({ ...fieldErrors(e), form: errorMessage(e) });
      setPending(false);
    }
  }
  return { pending, errors, submit };
}

function PaymentDialog({ studentId, onClose, onDone }) {
  const [form, setForm] = useState({ amount: "", channel: "bank", reference: "", paid_on: new Date().toISOString().slice(0, 10), note: "" });
  const { pending, errors, submit } = useSubmit(onDone);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>For money paid at the bank or the cashier. A receipt is issued and the student is notified.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="pay-amount" label="Amount (GHS)" required error={errors.amount}>
            {(aria) => <Input type="number" inputMode="decimal" min="0.01" step="0.01" value={form.amount} onChange={set("amount")} {...aria} />}
          </Field>
          <Field id="pay-channel" label="Method">
            {(aria) => (
              <NativeSelect value={form.channel} onChange={set("channel")} {...aria}>
                {METHODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
            )}
          </Field>
          <Field id="pay-reference" label="Bank slip or receipt number" required error={errors.reference}
                 hint="Use the bank's own number, so the same payment is not recorded again from a bank statement.">
            {(aria) => <Input value={form.reference} maxLength={64} onChange={set("reference")} {...aria} />}
          </Field>
          <Field id="pay-date" label="Date paid" error={errors.paid_on}>
            {(aria) => <Input type="date" value={form.paid_on} onChange={set("paid_on")} {...aria} />}
          </Field>
          <Field id="pay-note" label="Note" className="sm:col-span-2">
            {(aria) => <Input value={form.note} maxLength={255} onChange={set("note")} {...aria} />}
          </Field>
        </div>
        {errors.form && !errors.amount && <p className="text-sm text-destructive">{errors.form}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button disabled={pending || !(Number(form.amount) > 0) || !form.reference.trim()}
                  onClick={() => submit(() => api.post(`/student-accounts/${studentId}/record-payment/`, { ...form, paid_on: form.paid_on || null }),
                                        "Payment recorded.")}>
            {pending && <Loader2 className="animate-spin" />}
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const KINDS = {
  WAIVER: { label: "Waiver or scholarship", hint: "Reduces what the student owes and counts as paid." },
  ADJUSTMENT: { label: "Correction to the bill", hint: "A positive amount adds to the bill; a negative amount lowers it." },
  REFUND: { label: "Refund", hint: "Money given back to the student. Record it here once the refund has been made." },
};

function EntryDialog({ studentId, onClose, onDone }) {
  const [form, setForm] = useState({ kind: "WAIVER", amount: "", reason: "" });
  const { pending, errors, submit } = useSubmit(onDone);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Waiver, refund or correction</DialogTitle>
          <DialogDescription>{KINDS[form.kind].hint}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="entry-kind" label="Type">
            {(aria) => (
              <NativeSelect value={form.kind} onChange={set("kind")} {...aria}>
                {Object.entries(KINDS).map(([value, k]) => <option key={value} value={value}>{k.label}</option>)}
              </NativeSelect>
            )}
          </Field>
          <Field id="entry-amount" label="Amount (GHS)" required error={errors.amount}>
            {(aria) => <Input type="number" inputMode="decimal" step="0.01" value={form.amount} onChange={set("amount")} {...aria} />}
          </Field>
          <Field id="entry-reason" label="Reason" required error={errors.reason} hint="Recorded in the audit log and shown on the statement." className="sm:col-span-2">
            {(aria) => <Input value={form.reason} maxLength={200} onChange={set("reason")} {...aria} />}
          </Field>
        </div>
        {errors.form && !errors.amount && !errors.reason && <p className="text-sm text-destructive">{errors.form}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button disabled={pending || !form.amount || !form.reason.trim()}
                  onClick={() => submit(() => api.post(`/student-accounts/${studentId}/entry/`, form), `${KINDS[form.kind].label} recorded.`)}>
            {pending && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReverseDialog({ studentId, line, onClose, onDone }) {
  const [reason, setReason] = useState("");
  const { pending, errors, submit } = useSubmit(onDone);
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reverse this entry?</DialogTitle>
          <DialogDescription>
            {line.description} ({formatMoney(Math.abs(Number(line.amount)))}). A reversing entry is added; the original stays on the
            statement.
          </DialogDescription>
        </DialogHeader>
        <Field id="reverse-reason" label="Reason" required error={errors.reason || errors.form}>
          {(aria) => <Input value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} {...aria} />}
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button variant="destructive" disabled={pending || !reason.trim()}
                  onClick={() => submit(() => api.post(`/student-accounts/${studentId}/reverse/`, { entry: line.id, reason }), "Entry reversed.")}>
            {pending && <Loader2 className="animate-spin" />}
            Reverse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
