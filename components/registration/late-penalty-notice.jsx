"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";
import { formatMoney } from "@/lib/format";

/** True while the late registration penalty still stops this registration. */
export function lateBlocked(state) {
  return Boolean(state && (!state.charged || Number(state.outstanding) > 0));
}

/**
 * The late registration penalty for a student who missed the window. `url` and `body` add it to
 * their account (the student's own endpoint, or the registry's); `onAdded(payload)` receives the
 * refreshed registration options. `payHref` links to paying it (students only).
 */
export function LatePenaltyNotice({ state, url, body, onAdded, payHref, forStaff = false }) {
  const [pending, setPending] = useState(false);
  if (!state) return null;

  async function add() {
    setPending(true);
    try {
      const { data } = await api.post(url, body);
      toast.success(`Late registration penalty of ${formatMoney(state.amount)} added${forStaff ? " to the student's account" : " to your fees"}.`);
      onAdded(data);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  if (!lateBlocked(state)) {
    return (
      <Alert variant="success">
        <AlertTitle>Late registration penalty paid</AlertTitle>
        <AlertDescription>{forStaff ? "The student" : "You"} can register now.</AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert variant="warning">
      <AlertTitle>Late registration: {formatMoney(state.amount)} penalty</AlertTitle>
      <AlertDescription>
        <p>
          {forStaff
            ? `Registration has closed. A late registration penalty of ${formatMoney(state.amount)} must be on the student's account and paid in full before they can be registered.`
            : state.message}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {!state.charged ? (
            <Button size="sm" onClick={add} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {forStaff ? "Add the penalty to their account" : "Add the penalty to my fees"}
            </Button>
          ) : (
            <span className="text-sm font-medium">{formatMoney(state.outstanding)} still to pay.</span>
          )}
          {state.charged && payHref && (
            <Button asChild size="sm">
              <Link href={payHref}>Pay now</Link>
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
