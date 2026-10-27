"use client";

import { StatusBadge } from "@/components/common";
import { ResourcePage } from "@/components/resource-page";

const AWARD_OPTIONS = [
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "DIPLOMA", label: "Diploma" },
  { value: "HND", label: "Higher National Diploma" },
  { value: "BACHELOR", label: "Bachelor's Degree" },
  { value: "PGD", label: "Postgraduate Diploma" },
  { value: "MASTER", label: "Master's Degree" },
  { value: "DOCTORATE", label: "Doctorate" },
  { value: "OTHER", label: "Other" },
];

const FIELDS = [
  { name: "code", label: "Code", required: true },
  { name: "name", label: "Name", required: true },
  { name: "department", label: "Department", type: "relation", endpoint: "/departments/", optionLabel: (d) => `${d.code} – ${d.name}`, required: true },
  { name: "award_type", label: "Award", type: "select", options: AWARD_OPTIONS, required: true, default: "BACHELOR" },
  { name: "duration_years", label: "Normal duration (years)", type: "number", min: 1, required: true, default: "4" },
  { name: "required_credits", label: "Credits required to graduate", type: "number", min: 0 },
  { name: "min_credits_per_semester", label: "Minimum credits per semester", type: "number", min: 0 },
  { name: "max_credits_per_semester", label: "Maximum credits per semester", type: "number", min: 0 },
  { name: "levels", label: "Levels in this programme", type: "multirelation", endpoint: "/levels/" },
  { name: "is_active", label: "Active", type: "checkbox", default: true },
];

const COLUMNS = [
  { key: "code", header: "Code", sortKey: "code", cell: (r) => <span className="font-medium">{r.code}</span> },
  { key: "name", header: "Programme", sortKey: "name" },
  { key: "department_name", header: "Department" },
  { key: "award_type_display", header: "Award" },
  { key: "credits", header: "Credits / semester", cell: (r) => `${r.min_credits_per_semester ?? "–"} – ${r.max_credits_per_semester ?? "–"}` },
  { key: "student_count", header: "Active students" },
  { key: "is_active", header: "Status", cell: (r) => <StatusBadge status={r.is_active ? "ACTIVE" : "CLOSED"} label={r.is_active ? "Active" : "Inactive"} /> },
];

export default function ProgrammesPage() {
  return (
    <ResourcePage
      title="Programmes"
      description="Open a programme to manage its curriculum."
      endpoint="/programmes/"
      columns={COLUMNS}
      fields={FIELDS}
      singular="programme"
      readRoles={["ADMIN", "REGISTRAR"]}
      writeRoles={["ADMIN"]}
      filters={[{ key: "department", label: "Department", endpoint: "/departments/" }, { key: "award_type", label: "Award", options: AWARD_OPTIONS }]}
      rowHref={(row) => `/academics/programmes/${row.id}`}
      defaultOrdering="name"
    />
  );
}
