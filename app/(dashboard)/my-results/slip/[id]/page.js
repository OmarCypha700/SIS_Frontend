"use client";

import { useParams } from "next/navigation";
import { Printer } from "lucide-react";

import { ErrorState, LoadingBlock, RoleGate } from "@/components/common";
import { SemesterResults } from "@/components/results/academic-record";
import { PdfButton } from "@/components/export-menu";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { formatDate } from "@/lib/format";

export default function ResultSlipPage() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi("/my-results/slip/", { semester: id });

  return (
    <RoleGate roles={["STUDENT"]}>
      {loading && !data && <LoadingBlock />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 flex justify-end gap-2 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> Print
            </Button>
            <PdfButton url="/my-results/slip-pdf/" params={{ semester: id }} filename="result-slip.pdf" />
          </div>
          <article className="space-y-5 rounded-xl border bg-card p-6 print:border-0 print:p-0">
            <header className="border-b pb-4 text-center">
              <p className="text-lg font-semibold">{data.institution.name}</p>
              <p className="text-sm uppercase tracking-wider text-muted-foreground">Semester result slip</p>
            </header>
            <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {[
                ["Name", data.student.full_name],
                ["Student number", data.student.student_number],
                ["Programme", data.student.programme],
                ["Level", data.student.level],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b border-dashed py-1">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <SemesterResults semester={data.semester} compact />
            <p className="text-sm">
              Cumulative GPA: <strong>{data.summary.cgpa ?? "—"}</strong>
            </p>
            {data.institution.footer && <p className="text-xs text-muted-foreground">{data.institution.footer}</p>}
            <p className="text-xs text-muted-foreground">Generated {formatDate(new Date())}. Unofficial copy.</p>
          </article>
        </div>
      )}
    </RoleGate>
  );
}
