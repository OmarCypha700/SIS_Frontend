"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

import { PageHeader, RoleGate } from "@/components/common";
import { PdfButton } from "@/components/export-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { api, errorMessage } from "@/lib/api";
import { formatMoney } from "@/lib/format";

async function verify(reference) {
  try {
    const { data } = await api.post(`/my-fees/payments/${encodeURIComponent(reference)}/verify/`);
    return { loading: false, ...data };
  } catch (e) {
    return { loading: false, error: errorMessage(e) };
  }
}

/** Where the student lands after paying: confirm the payment with the server and say what happened. */
export default function PaymentReturnPage() {
  const params = useSearchParams();
  const reference = params.get("reference") || params.get("trxref") || "";
  const [result, setResult] = useState({ loading: Boolean(reference) });
  const state = reference ? result : { loading: false, error: "No payment reference was given." };

  const check = useCallback(async () => {
    setResult((s) => ({ ...s, loading: true }));
    setResult(await verify(reference));
  }, [reference]);

  useEffect(() => {
    if (!reference) return undefined;
    let cancelled = false;
    verify(reference).then((outcome) => !cancelled && setResult(outcome));
    return () => {
      cancelled = true;
    };
  }, [reference]);

  const payment = state.payment;
  const status = payment?.status;
  return (
    <RoleGate roles={["STUDENT"]}>
      <PageHeader title="Payment" />
      <Card className="mx-auto max-w-lg">
        {state.loading && !payment ? (
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Confirming your payment…</p>
          </CardContent>
        ) : state.error ? (
          <CardHeader>
            <XCircle className="size-8 text-destructive" />
            <CardTitle>We could not check this payment</CardTitle>
            <CardDescription>{state.error}</CardDescription>
          </CardHeader>
        ) : status === "SUCCESS" ? (
          <CardHeader>
            <CheckCircle2 className="size-8 text-emerald-600" />
            <CardTitle>Payment received</CardTitle>
            <CardDescription>
              {formatMoney(payment.amount)} has been added to your fees account. Receipt {payment.receipt_number}.
              {state.cleared ? " You have paid enough to register for this semester." : ""}
            </CardDescription>
          </CardHeader>
        ) : status === "PENDING" ? (
          <CardHeader>
            <Clock className="size-8 text-amber-600" />
            <CardTitle>Waiting for confirmation</CardTitle>
            <CardDescription>
              If you approved the payment on your phone, it can take a minute to confirm. Check again shortly. If you did not
              finish paying, you have not been charged.
            </CardDescription>
          </CardHeader>
        ) : (
          <CardHeader>
            <XCircle className="size-8 text-destructive" />
            <CardTitle>{status === "MISMATCH" ? "Payment needs checking" : "Payment not completed"}</CardTitle>
            <CardDescription>
              {status === "MISMATCH"
                ? "The payment service reported something different from what was expected. The Accounts Office has been told and will contact you."
                : "The payment did not go through. You can try again."}
            </CardDescription>
          </CardHeader>
        )}
        {!state.loading || payment ? (
          <CardFooter className="flex-wrap gap-2">
            {status === "SUCCESS" && (
              <PdfButton url={`/my-fees/payments/${payment.reference}/receipt/`} filename={`receipt-${payment.receipt_number}.pdf`}
                         label="Download receipt" />
            )}
            {status === "SUCCESS" && state.cleared && (
              <Button asChild variant="outline">
                <Link href="/registration">Register courses</Link>
              </Button>
            )}
            {status === "PENDING" && (
              <Button onClick={check} disabled={state.loading}>
                {state.loading && <Loader2 className="animate-spin" />}
                Check again
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/fees">Back to fees</Link>
            </Button>
          </CardFooter>
        ) : null}
      </Card>
    </RoleGate>
  );
}
