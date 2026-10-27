"use client";

import { Printer } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { SemesterResults } from "@/components/results/academic-record";
import { PdfButton } from "@/components/export-menu";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

/** Academic record as a printable page, with a server-generated PDF download (`pdfUrl`). */
export function Transcript({ record, title = "Academic record", unofficial = true, pdfUrl, pdfParams }) {
  const { institution } = useAuth();
  const s = record.student;
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex justify-end gap-2 print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer /> Print
        </Button>
        {pdfUrl && <PdfButton url={pdfUrl} params={pdfParams} filename={`transcript-${s.student_number}.pdf`} />}
      </div>
      <article className="space-y-6 rounded-xl border bg-card p-6 print:border-0 print:p-0">
        <header className="flex flex-col gap-1 border-b pb-4 text-center">
          <p className="text-lg font-semibold">{institution?.name}</p>
          <p className="text-sm uppercase tracking-wider text-muted-foreground">{title}</p>
          {unofficial && <p className="text-xs text-muted-foreground">Unofficial copy generated {formatDate(new Date())}</p>}
        </header>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row label="Name" value={s.full_name} />
          <Row label="Student number" value={s.student_number} />
          <Row label="Programme" value={`${s.programme} (${s.programme_code})`} />
          <Row label="Current level" value={s.level} />
          <Row label="Admission year" value={s.admission_year} />
          <Row label="CGPA" value={record.summary.cgpa ?? "—"} />
        </dl>
        {record.semesters.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No results recorded.</p>
        ) : (
          record.semesters.map((semester) => <SemesterResults key={semester.semester_id} semester={semester} compact />)
        )}
        <footer className="border-t pt-4 text-sm">
          Credits attempted {record.summary.credits_attempted} · credits earned {record.summary.credits_earned}
          {record.summary.required_credits ? ` of ${record.summary.required_credits} required` : ""} · cumulative GPA{" "}
          <strong>{record.summary.cgpa ?? "—"}</strong>
        </footer>
      </article>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed py-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
