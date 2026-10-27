"use client";

import { StatusBadge } from "@/components/common";
import { ResourcePage } from "@/components/resource-page";

const FIELDS = [
  { name: "code", label: "Code", required: true },
  { name: "name", label: "Name", required: true },
  { name: "description", label: "Description", type: "textarea" },
  { name: "is_active", label: "Active", type: "checkbox", default: true },
];

const COLUMNS = [
  { key: "code", header: "Code", sortKey: "code", cell: (r) => <span className="font-medium">{r.code}</span> },
  { key: "name", header: "Name", sortKey: "name" },
  { key: "is_active", header: "Status", cell: (r) => <StatusBadge status={r.is_active ? "ACTIVE" : "CLOSED"} label={r.is_active ? "Active" : "Inactive"} /> },
];

export default function DepartmentsPage() {
  return (
    <ResourcePage
      title="Departments"
      description="Academic units that own programmes and courses."
      endpoint="/departments/"
      columns={COLUMNS}
      fields={FIELDS}
      singular="department"
      readRoles={["ADMIN", "REGISTRAR"]}
      writeRoles={["ADMIN"]}
      defaultOrdering="name"
    />
  );
}
