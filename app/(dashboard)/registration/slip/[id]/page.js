"use client";

import { useParams } from "next/navigation";
import { Printer } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingBlock, StatusBadge } from "@/components/common";
import { RegisteredCourses } from "@/components/registration/registration-detail";
import { PdfButton } from "@/components/export-menu";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { formatDateTime } from "@/lib/format";

export default function RegistrationSlipPage() {
  const { id } = useParams();
  const { institution } = useAuth();
  const { data, error, loading, reload } = useApi(`/registrations/${id}/`);

  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex justify-end gap-2 print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer /> Print
        </Button>
        <PdfButton url={`/registrations/${id}/slip-pdf/`} filename="registration-slip.pdf" />
      </div>
      <article className="space-y-6 rounded-xl border bg-card p-6 print:border-0 print:p-0">
        <header className="border-b pb-4 text-center">
          <p className="text-lg font-semibold">{institution?.name}</p>
          <p className="text-sm uppercase tracking-wider text-muted-foreground">Course registration slip</p>
        </header>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {[
            ["Name", data.student_name],
            ["Student number", data.student_number],
            ["Programme", data.programme_code],
            ["Level", data.level_name],
            ["Semester", data.semester_name],
            ["Submitted", formatDateTime(data.submitted_at)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-dashed py-1">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 py-1">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <StatusBadge status={data.status} label={data.status_display} />
            </dd>
          </div>
        </dl>
        <div className="-mx-6 print:mx-0">
          <RegisteredCourses registration={data} />
        </div>
        <p className="text-xs text-muted-foreground">Reference #{data.id}. Generated {formatDateTime(new Date())}.</p>
      </article>
    </div>
  );
}
