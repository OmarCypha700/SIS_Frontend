"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, CircleX } from "lucide-react";

import { LoadingBlock } from "@/components/common";
import { VerifyForm } from "@/components/transcripts/verify-form";
import { api, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Public verification result for one transcript code (opened from the QR code). */
export default function VerifyResultPage() {
  const { code } = useParams();
  const [state, setState] = useState({ data: null, error: null, notFound: false });

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/transcripts/verify/${encodeURIComponent(code)}/`)
      .then(({ data }) => !cancelled && setState({ data, error: null, notFound: false }))
      .catch((error) => {
        if (cancelled) return;
        const notFound = error.response?.status === 404;
        setState({ data: null, notFound, error: notFound ? null : errorMessage(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const { data, error, notFound } = state;
  if (!data && !error && !notFound) return <LoadingBlock rows={4} />;

  if (!data) {
    return (
      <div className="space-y-6">
        <Banner tone="bad" icon={CircleX} title={notFound ? "No matching transcript" : "Could not check this code"}>
          {notFound
            ? "No transcript was issued with this code. Check the code printed under the QR code. If it still does not match, the document may not be genuine — contact the registry."
            : error}
        </Banner>
        <VerifyForm initial={code} />
      </div>
    );
  }

  const valid = data.status === "VALID";
  return (
    <div className="space-y-6">
      <Banner
        tone={valid ? "good" : "bad"}
        icon={valid ? CircleCheck : CircleX}
        title={valid ? "Valid transcript" : "This transcript has been revoked"}
      >
        {valid
          ? `Issued by ${data.institution}. Check that the details below match the document you were given.`
          : `${data.institution} revoked this transcript on ${formatDate(data.revoked_on)}. It should not be relied on; ask the holder for a current transcript.`}
      </Banner>
      {data.is_interim && (
        <Banner tone="note" icon={CircleAlert} title="Interim transcript">
          Issued before the programme was completed or while some results were pending.
        </Banner>
      )}
      <dl className="divide-y rounded-lg border text-sm">
        {[
          ["Serial number", data.serial],
          ["Student", data.student_name],
          ["Student number", data.student_number],
          ["Programme", data.programme],
          ["Cumulative GPA", data.cgpa ?? "—"],
          ["Credits earned", data.credits_earned],
          ["Results up to", data.covers_up_to ?? "—"],
          ["Date of issue", formatDate(data.issued_on)],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-2.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">
        Individual grades are not shown here. Compare the cumulative GPA, serial number and date with the printed
        transcript. <Link href="/verify" className="underline">Check another code</Link>
      </p>
    </div>
  );
}

function Banner({ tone, icon: Icon, title, children }) {
  return (
    <div
      role="status"
      className={cn(
        "flex gap-3 rounded-lg border p-4",
        tone === "good" && "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
        tone === "bad" && "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100",
        tone === "note" && "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div className="space-y-1">
        <h1 className="font-semibold">{title}</h1>
        <p className="text-sm">{children}</p>
      </div>
    </div>
  );
}
