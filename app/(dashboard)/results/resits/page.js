"use client";

import { PageHeader, RoleGate, StatusBadge } from "@/components/common";
import { DataTable } from "@/components/tables/data-table";
import { formatDateTime } from "@/lib/format";
import { SHEET_STATUS_OPTIONS } from "@/lib/options";

const COLUMNS = [
  {
    key: "course_code",
    header: "Course",
    cell: (r) => (
      <>
        <span className="font-medium">{r.course_code}</span>
        <span className="block text-xs text-muted-foreground">{r.course_title}</span>
      </>
    ),
  },
  { key: "semester_name", header: "Semester" },
  { key: "counts", header: "Registered / eligible", cell: (r) => `${r.registered_count} / ${r.eligible_count}` },
  { key: "registration_deadline", header: "Registration deadline", cell: (r) => formatDateTime(r.registration_deadline) },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} label={r.status_display} /> },
  { key: "published_at", header: "Published", cell: (r) => formatDateTime(r.published_at) },
];

export default function ResitsPage() {
  return (
    <RoleGate roles={["ADMIN", "REGISTRAR", "RESULTS_OFFICER", "LECTURER"]}>
      <PageHeader
        title="Resits"
        description="Supplementary examinations for failed courses. Open a resit from a published result sheet."
      />
      <DataTable
        endpoint="/resit-sheets/"
        columns={COLUMNS}
        searchPlaceholder="Search course…"
        rowHref={(r) => `/results/resits/${r.id}`}
        filters={[{ key: "status", label: "Status", options: SHEET_STATUS_OPTIONS }]}
        emptyTitle="No resits"
        emptyDescription="Resits appear here once one is opened from a published result sheet."
      />
    </RoleGate>
  );
}
