"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, CreditCard, Landmark, Loader2, Receipt, Wallet } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingBlock, PageHeader, RoleGate, StatCard, StatusBadge } from "@/components/common";
import { PdfButton } from "@/components/export-menu";
import { FeeStatement, RequirementSummary } from "@/components/fees/fee-statement";
import { Field } from "@/components/forms/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useApi, useDebounced } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, formatMoney } from "@/lib/format";

const METHOD = { mobile_money: "Mobile money", card: "Card", bank: "Bank", bank_transfer: "Bank transfer", cash: "Cash" };

export default function MyFeesPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi("/my-fees/");
  const [paying, setPaying] = useState(false);
  const summary = data?.summary;
  const balance = Number(summary?.balance ?? 0);
  const shortBy = Number(summary?.short_by ?? 0);

  return (
    <RoleGate roles={["STUDENT"]}>
      <PageHeader
        title="Fees"
        description="What you owe, what you have paid, and what you need to pay to register."
        actions={data && <PdfButton url="/my-fees/statement-pdf/" filename="fees-statement.pdf" label="Statement" variant="outline" />}
      />
      {loading && !data && <LoadingBlock rows={6} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <StatCard
              label={balance < 0 ? "In credit" : "Balance owed"}
              value={formatMoney(Math.abs(balance))}
              icon={Wallet}
              tone={balance > 0 ? "amber" : "green"}
              className="col-span-2 lg:col-span-1"
            />
            <StatCard
              label="To pay to register"
              value={summary?.billed ? formatMoney(shortBy) : "—"}
              hint={summary?.billed ? (summary.meets ? "You have paid enough to register" : `${summary.percent_required}% rule`) : "No fees billed yet"}
              icon={BadgeCheck}
              tone={summary?.meets ? "green" : "brand"}
            />
            <StatCard
              label="This period's fees"
              value={summary?.billed ? formatMoney(summary.current_bill) : "—"}
              hint={summary?.billed ? `${summary.percent_paid ?? 0}% paid` : undefined}
              icon={Receipt}
              tone="blue"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pay your fees</CardTitle>
              <CardDescription>
                {data.online_enabled
                  ? "Pay by mobile money (MTN, Telecel, AirtelTigo), card or bank. You can pay in parts."
                  : "Online payment is not available yet. Pay at the bank or the Accounts Office and keep your receipt."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RequirementSummary summary={summary} />
              {data.online_enabled ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button size="lg" className="w-full sm:w-auto" disabled={balance <= 0} onClick={() => setPaying(true)}>
                    <CreditCard /> {balance <= 0 ? "Nothing to pay" : "Pay now"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    A transaction fee of about {Number(data.fee_percent)}% is added and shown before you pay.
                  </p>
                </div>
              ) : (
                <Alert>
                  <Landmark />
                  <AlertTitle>Paying at the bank</AlertTitle>
                  <AlertDescription>
                    Quote your student number{user?.student?.student_number ? ` (${user.student.student_number})` : ""} as the
                    reference. The Accounts Office records the payment and it appears here.
                  </AlertDescription>
                </Alert>
              )}
              {summary?.meets && data.clearance_required && (
                <Button asChild variant="outline">
                  <Link href="/registration">Go to course registration</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Statement</CardTitle>
                <CardDescription>Fees charged and payments, oldest first.</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <FeeStatement lines={data.statement} />
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
                      <li key={p.reference} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium tabular-nums">{formatMoney(p.amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateTime(p.paid_at || p.created_at)}
                            {p.channel ? ` · ${METHOD[p.channel] || p.channel}` : ""}
                          </p>
                          {p.status !== "SUCCESS" && <StatusBadge status={p.status === "PENDING" ? "PENDING" : "REJECTED"} label={p.status_display} />}
                        </div>
                        {p.status === "SUCCESS" ? (
                          <PdfButton url={`/my-fees/payments/${p.reference}/receipt/`} filename={`receipt-${p.receipt_number}.pdf`}
                                     label="Receipt" variant="outline" size="sm" />
                        ) : p.status === "PENDING" ? (
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/fees/return?reference=${encodeURIComponent(p.reference)}`}>Check</Link>
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      {paying && data && (
        <PayDialog suggested={shortBy > 0 ? shortBy : balance} balance={balance} onClose={() => setPaying(false)} />
      )}
    </RoleGate>
  );
}

function PayDialog({ suggested, balance, onClose }) {
  const [amount, setAmount] = useState(suggested.toFixed(2));
  const debounced = useDebounced(amount, 350);
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!(Number(debounced) > 0)) return undefined;
    api.get("/my-fees/quote/", { params: { amount: debounced } })
      .then(({ data }) => !cancelled && (setQuote(data), setError("")))
      .catch((e) => !cancelled && (setQuote(null), setError(errorMessage(e))));
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  async function pay() {
    setPending(true);
    setError("");
    try {
      const { data } = await api.post("/my-fees/pay/", { amount });
      window.location.assign(data.authorization_url);
    } catch (e) {
      setError(errorMessage(e));
      setPending(false);
    }
  }

  const ready = quote && Number(quote.amount) === Number(amount) && !error;
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay school fees</DialogTitle>
          <DialogDescription>
            You will be taken to a secure payment page to pay by mobile money, card or bank. You can pay any amount up to
            {" "}{formatMoney(balance)}.
          </DialogDescription>
        </DialogHeader>
        <Field id="pay-amount" label="Amount for school fees (GHS)" error={error}>
          {(aria) => (
            <Input type="number" inputMode="decimal" min="1" step="0.01" max={balance} value={amount}
                   onChange={(e) => setAmount(e.target.value)} {...aria} />
          )}
        </Field>
        {quote && !error && (
          <dl className="space-y-1 rounded-lg border bg-muted/40 p-3 text-sm tabular-nums">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">School fees</dt>
              <dd>{formatMoney(quote.amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Transaction fee</dt>
              <dd>{formatMoney(quote.fee)}</dd>
            </div>
            <div className="flex justify-between border-t pt-1 font-semibold">
              <dt>You pay</dt>
              <dd>{formatMoney(quote.total)}</dd>
            </div>
          </dl>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={pay} disabled={pending || !ready}>
            {pending && <Loader2 className="animate-spin" />}
            {quote ? `Pay ${formatMoney(quote.total)}` : "Pay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
