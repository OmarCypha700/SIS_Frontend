"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Upload } from "lucide-react";

import { hasRole, useAuth } from "@/components/auth/auth-provider";
import { PageHeader, RoleGate, StatusBadge } from "@/components/common";
import { ExportMenu } from "@/components/export-menu";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { STUDENT_STATUS_OPTIONS } from "@/lib/options";

const COLUMNS = [
  { key: "student_number", header: "Student no.", sortKey: "student_number", cell: (r) => <span className="font-medium">{r.student_number}</span> },
  { key: "full_name", header: "Name", sortKey: "last_name" },
  { key: "programme_code", header: "Programme" },
  { key: "level_name", header: "Level" },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
];

export default function StudentsPage() {
  const { user } = useAuth();
  const canManage = hasRole(user, "ADMIN", "REGISTRAR");
  const [lastQuery, setLastQuery] = useState({});

  const { page, page_size, ...exportFilters } = lastQuery;

  return (
    <RoleGate roles={["ADMIN", "REGISTRAR", "RESULTS_OFFICER"]}>
      <PageHeader
        title="Student records"
        description="Search, filter and manage student records."
        actions={
          canManage && (
            <>
              <ExportMenu url="/students/export/" params={exportFilters} filename="students" />
              <Button variant="outline" asChild>
                <Link href="/students/import">
                  <Upload /> Import
                </Link>
              </Button>
              <Button asChild>
                <Link href="/students/new">
                  <Plus /> Add student
                </Link>
              </Button>
            </>
          )
        }
      />
      <DataTable
        endpoint="/students/"
        columns={COLUMNS}
        searchPlaceholder="Search number, name or email…"
        defaultOrdering="last_name"
        rowHref={(row) => `/students/${row.id}`}
        onData={(_, params) => setLastQuery(params)}
        filters={[
          { key: "programme", label: "Programme", endpoint: "/programmes/", optionLabel: (p) => p.code },
          { key: "level", label: "Level", endpoint: "/levels/" },
          { key: "status", label: "Status", options: STUDENT_STATUS_OPTIONS },
          { key: "admission_year", label: "Admission year", options: yearOptions() },
        ]}
      />
    </RoleGate>
  );
}

function yearOptions() {
  const current = new Date().getFullYear();
  return Array.from({ length: 8 }, (_, i) => String(current - i)).map((y) => ({ value: y, label: y }));
}
