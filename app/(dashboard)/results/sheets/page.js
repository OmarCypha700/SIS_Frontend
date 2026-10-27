"use client";

import { PageHeader, RoleGate, StatusBadge } from "@/components/common";
import { DataTable } from "@/components/tables/data-table";
import { formatDateTime } from "@/lib/format";
import { SHEET_STATUS_OPTIONS } from "@/lib/options";

const COLUMNS = [
  {
    key: "course_code",
    header: "Course",
    sortKey: "offering__course__code",
    cell: (r) => (
      <>
        <span className="font-medium">{r.course_code}</span>
        <span className="block text-xs text-muted-foreground">{r.course_title}</span>
      </>
    ),
  },
  { key: "semester_name", header: "Semester" },
  { key: "lecturers", header: "Lecturers", cell: (r) => r.lecturers.join(", ") || "—" },
  { key: "student_count", header: "Students" },
  { key: "status", header: "Status", sortKey: "status", cell: (r) => <StatusBadge status={r.status} label={r.status_display} /> },
  { key: "submitted_at", header: "Submitted", sortKey: "submitted_at", cell: (r) => formatDateTime(r.submitted_at) },
  { key: "published_at", header: "Published", cell: (r) => formatDateTime(r.published_at) },
];

export default function ResultSheetsPage() {
  return (
    <RoleGate roles={["ADMIN", "REGISTRAR", "RESULTS_OFFICER"]}>
      <PageHeader title="Result sheets" description="Review submitted results, return them for correction, approve and publish." />
      <DataTable
        endpoint="/result-sheets/"
        columns={COLUMNS}
        searchPlaceholder="Search course…"
        defaultOrdering="-submitted_at"
        rowHref={(r) => `/results/sheets/${r.id}`}
        filters={[
          { key: "status", label: "Status", options: SHEET_STATUS_OPTIONS },
          { key: "semester", label: "Semester", endpoint: "/semesters/", optionLabel: (s) => `${s.academic_year_name} ${s.name}` },
          { key: "department", label: "Department", endpoint: "/departments/", optionLabel: (d) => d.code },
          { key: "programme", label: "Programme", endpoint: "/programmes/", optionLabel: (p) => p.code },
          { key: "level", label: "Level", endpoint: "/levels/" },
        ]}
        emptyTitle="No result sheets"
        emptyDescription="Sheets appear once a lecturer opens a course to enter marks."
      />
    </RoleGate>
  );
}
