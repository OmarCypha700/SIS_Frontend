"use client";

import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/common";
import { ResourcePage } from "@/components/resource-page";
import { Badge } from "@/components/ui/badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";

const STATUS_OPTIONS = [
  { value: "PLANNED", label: "Planned" },
  { value: "ACTIVE", label: "Active" },
  { value: "CLOSED", label: "Closed" },
];

const YEAR_FIELDS = [
  { name: "name", label: "Name", required: true, hint: "For example 2025/2026" },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, required: true, default: "PLANNED" },
  { name: "start_date", label: "Start date", type: "date", required: true },
  { name: "end_date", label: "End date", type: "date", required: true },
];

const YEAR_COLUMNS = [
  { key: "name", header: "Academic year", sortKey: "name", cell: (r) => <span className="font-medium">{r.name}</span> },
  { key: "start_date", header: "Starts", sortKey: "start_date", cell: (r) => formatDate(r.start_date) },
  { key: "end_date", header: "Ends", cell: (r) => formatDate(r.end_date) },
  { key: "semester_count", header: "Semesters" },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
];

const SEMESTER_FIELDS = [
  { name: "academic_year", label: "Academic year", type: "relation", endpoint: "/academic-years/", required: true },
  { name: "name", label: "Name", required: true, hint: "For example First Semester" },
  { name: "term_number", label: "Term number", type: "number", min: 1, required: true, hint: "Position of this term in the year" },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, required: true, default: "PLANNED" },
  { name: "start_date", label: "Start date", type: "date", required: true },
  { name: "end_date", label: "End date", type: "date", required: true },
  { name: "registration_start", label: "Registration opens", type: "datetime", required: true },
  { name: "registration_end", label: "Registration closes", type: "datetime", required: true },
  { name: "add_drop_deadline", label: "Add/drop deadline", type: "datetime", hint: "Optional; students may amend until then" },
  { name: "result_entry_deadline", label: "Result entry deadline", type: "datetime" },
  { name: "result_publication_date", label: "Result publication date", type: "date" },
];

const SEMESTER_COLUMNS = [
  {
    key: "name",
    header: "Semester",
    cell: (r) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{r.academic_year_name} · {r.name}</span>
        {r.is_current && <Badge>Current</Badge>}
      </div>
    ),
  },
  { key: "dates", header: "Dates", cell: (r) => `${formatDate(r.start_date)} – ${formatDate(r.end_date)}` },
  {
    key: "registration",
    header: "Registration window",
    cell: (r) => (
      <span className="text-sm">
        {formatDateTime(r.registration_start)} – {formatDateTime(r.registration_end)}
        {r.registration_open && <span className="ml-2 text-xs text-emerald-600">open</span>}
      </span>
    ),
  },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
];

export default function PeriodsPage() {
  return (
    <div className="space-y-10">
      <ResourcePage
        title="Academic years"
        description="Closed years are protected from changes to their dates."
        endpoint="/academic-years/"
        columns={YEAR_COLUMNS}
        fields={YEAR_FIELDS}
        singular="academic year"
        readRoles={["ADMIN", "REGISTRAR"]}
        writeRoles={["ADMIN"]}
        defaultOrdering="-start_date"
      />
      <ResourcePage
        title="Semesters"
        description="Set the current semester and its registration and result deadlines."
        endpoint="/semesters/"
        columns={SEMESTER_COLUMNS}
        fields={SEMESTER_FIELDS}
        singular="semester"
        readRoles={["ADMIN", "REGISTRAR"]}
        writeRoles={["ADMIN", "REGISTRAR"]}
        filters={[{ key: "academic_year", label: "Year", endpoint: "/academic-years/" }, { key: "status", label: "Status", options: STATUS_OPTIONS }]}
        defaultOrdering="-start_date"
        rowActions={(row, reload) =>
          !row.is_current && (
            <DropdownMenuItem
              onSelect={async () => {
                try {
                  await api.post(`/semesters/${row.id}/set-current/`);
                  toast.success(`${row.academic_year_name} ${row.name} is now the current semester.`);
                  reload();
                } catch (error) {
                  toast.error(errorMessage(error));
                }
              }}
            >
              <CheckCircle2 /> Make current
            </DropdownMenuItem>
          )
        }
      />
    </div>
  );
}
