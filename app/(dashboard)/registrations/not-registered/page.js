"use client";

import Link from "next/link";

import { PageHeader, RoleGate, StatusBadge } from "@/components/common";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";

const COLUMNS = [
  { key: "student_number", header: "Student no.", cell: (r) => <span className="font-medium">{r.student_number}</span> },
  { key: "full_name", header: "Name" },
  { key: "programme_code", header: "Programme" },
  { key: "level_name", header: "Level" },
  { key: "email", header: "Email" },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  {
    key: "action",
    header: <span className="sr-only">Actions</span>,
    className: "text-right",
    cell: (r) => (
      <Button asChild size="sm" variant="outline">
        <Link href={`/registrations/on-behalf?student=${r.id}`}>Register</Link>
      </Button>
    ),
  },
];

export default function NotRegisteredPage() {
  return (
    <RoleGate roles={["ADMIN", "REGISTRAR"]}>
      <PageHeader
        title="Students not registered"
        description="Students whose status allows registration but who have no active registration for the current semester."
      />
      <DataTable
        endpoint="/registrations/not-registered/"
        columns={COLUMNS}
        searchable={false}
        rowHref={(r) => `/students/${r.id}`}
        filters={[
          { key: "programme", label: "Programme", endpoint: "/programmes/", optionLabel: (p) => p.code },
          { key: "level", label: "Level", endpoint: "/levels/" },
        ]}
        emptyTitle="Every eligible student has registered"
      />
    </RoleGate>
  );
}
