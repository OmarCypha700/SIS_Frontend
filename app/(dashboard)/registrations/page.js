"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCheck, ListPlus, XCircle } from "lucide-react";

import { PageHeader, RoleGate, StatCard, StatusBadge } from "@/components/common";
import { ExportMenu } from "@/components/export-menu";
import { BulkActions } from "@/components/tables/bulk-actions";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { formatDateTime } from "@/lib/format";
import { REGISTRATION_STATUS_OPTIONS } from "@/lib/options";

const COLUMNS = [
  { key: "student_number", header: "Student no.", cell: (r) => <span className="font-medium">{r.student_number}</span> },
  { key: "student_name", header: "Name", sortKey: "student__last_name" },
  { key: "programme_code", header: "Programme" },
  { key: "level_name", header: "Level" },
  { key: "semester_name", header: "Semester" },
  { key: "course_count", header: "Courses" },
  { key: "total_credits", header: "Credits", sortKey: "total_credits" },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} label={r.status_display} /> },
  { key: "submitted_at", header: "Submitted", sortKey: "submitted_at", cell: (r) => formatDateTime(r.submitted_at) },
];

const registrations = (n) => `${n} registration${n === 1 ? "" : "s"}`;

const REVIEW_ACTIONS = [
  {
    value: "approve",
    label: "Approve",
    icon: CheckCheck,
    confirm: (n) => `Approve ${registrations(n)} awaiting approval. Any that are not awaiting approval are skipped.`,
    done: (n) => `${registrations(n)} approved.`,
  },
  {
    value: "reject",
    label: "Reject",
    icon: XCircle,
    destructive: true,
    confirm: (n) => `Reject ${registrations(n)}. Their courses are dropped and each student is told. The reason is shown to them.`,
    done: (n) => `${registrations(n)} rejected.`,
  },
];

export default function RegistrationsPage() {
  const { data: stats, reload: reloadStats } = useApi("/registrations/statistics/");
  const [query, setQuery] = useState({});
  const [selected, setSelected] = useState([]);
  const [refresh, setRefresh] = useState(0);

  const { page, page_size, ...exportFilters } = query;

  return (
    <RoleGate roles={["ADMIN", "REGISTRAR"]}>
      <PageHeader
        title="Registrations"
        description="Review, approve and export semester registrations. Tick registrations awaiting approval to approve or reject them together."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/registrations/bulk">
                <ListPlus /> Bulk registration
              </Link>
            </Button>
            <ExportMenu url="/registrations/export/" params={exportFilters} filename="registrations" />
          </>
        }
      />
      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label={`Registered · ${stats.semester.name}`} value={stats.registered} />
          <StatCard label="Awaiting approval" value={stats.pending} />
          <StatCard label="Eligible students" value={stats.eligible_students} hint={`${Math.max(stats.eligible_students - stats.registered - stats.pending, 0)} not yet registered`} />
        </div>
      )}
      <DataTable
        endpoint="/registrations/"
        columns={COLUMNS}
        searchPlaceholder="Search student…"
        defaultOrdering="-submitted_at"
        rowHref={(r) => `/registrations/${r.id}`}
        onData={(_, params) => setQuery(params)}
        refreshKey={refresh}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        rowLabel={(r) => `${r.student_number} ${r.student_name}`}
        filters={[
          { key: "semester", label: "Semester", endpoint: "/semesters/", optionLabel: (s) => `${s.academic_year_name} ${s.name}` },
          { key: "status", label: "Status", options: REGISTRATION_STATUS_OPTIONS },
          { key: "programme", label: "Programme", endpoint: "/programmes/", optionLabel: (p) => p.code },
          { key: "level", label: "Level", endpoint: "/levels/" },
          { key: "course", label: "Course", endpoint: "/courses/", optionLabel: (c) => c.code },
        ]}
      />
      <BulkActions
        endpoint="/registrations/bulk-review/"
        noun="registration"
        selectedIds={selected}
        onClear={() => setSelected([])}
        onDone={(stillSelected) => {
          setSelected(stillSelected);
          setRefresh((n) => n + 1);
          reloadStats();
        }}
        actions={REVIEW_ACTIONS}
      />
      {stats?.offerings?.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Enrolment by course · {stats.semester.name}</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stats.offerings.map((o) => (
              <div key={o.offering} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
                <span className="truncate">
                  <span className="font-medium">{o.course_code}</span> {o.course_title}
                </span>
                <span className="ml-3 shrink-0 tabular-nums text-muted-foreground">
                  {o.enrolled}
                  {o.capacity ? ` / ${o.capacity}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </RoleGate>
  );
}
