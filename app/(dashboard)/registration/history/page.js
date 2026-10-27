"use client";

import { PageHeader, RoleGate, StatusBadge } from "@/components/common";
import { DataTable } from "@/components/tables/data-table";
import { formatDateTime } from "@/lib/format";

const COLUMNS = [
  { key: "semester_name", header: "Semester", cell: (r) => <span className="font-medium">{r.semester_name}</span> },
  { key: "level_name", header: "Level" },
  { key: "course_count", header: "Courses" },
  { key: "total_credits", header: "Credits" },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} label={r.status_display} /> },
  { key: "submitted_at", header: "Last submitted", cell: (r) => formatDateTime(r.submitted_at) },
];

export default function RegistrationHistoryPage() {
  return (
    <RoleGate roles={["STUDENT"]}>
      <PageHeader title="Registration history" description="Every semester you have registered for. Select one to see its courses and slip." />
      <DataTable
        endpoint="/registrations/"
        columns={COLUMNS}
        searchable={false}
        rowHref={(r) => `/registration/slip/${r.id}`}
        emptyTitle="You have not registered for any semester yet"
      />
    </RoleGate>
  );
}
