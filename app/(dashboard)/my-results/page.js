"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

import { ErrorState, LoadingBlock, PageHeader, RoleGate, StatCard } from "@/components/common";
import { AcademicRecord } from "@/components/results/academic-record";
import { MyResits } from "@/components/results/my-resits";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";

export default function MyResultsPage() {
  const { data, error, loading, reload } = useApi("/my-results/");
  return (
    <RoleGate roles={["STUDENT"]}>
      <PageHeader
        title="My results"
        description="Only results that have been approved and published by your institution appear here."
        actions={
          <Button variant="outline" asChild>
            <Link href="/my-results/transcript">
              <FileText /> Academic record
            </Link>
          </Button>
        }
      />
      {loading && !data && <LoadingBlock rows={6} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Cumulative GPA" value={data.summary.cgpa ?? "—"} />
            <StatCard label="Credits earned" value={data.summary.credits_earned} hint={data.summary.required_credits ? `of ${data.summary.required_credits} required` : undefined} />
            <StatCard
              label="Academic standing"
              value={data.student.academic_standing === "PROBATION" ? "Probation" : "Good standing"}
              hint={`${data.summary.credits_attempted} credits attempted`}
            />
          </div>
          <MyResits />
          <AcademicRecord record={data} emptyTitle="No published results yet" />
          {data.semesters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.semesters.map((s) => (
                <Button key={s.semester_id} variant="outline" size="sm" asChild>
                  <Link href={`/my-results/slip/${s.semester_id}`}>Result slip · {s.academic_year} {s.semester}</Link>
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </RoleGate>
  );
}
