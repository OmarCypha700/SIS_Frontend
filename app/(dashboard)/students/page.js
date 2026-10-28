"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Power, PowerOff, Tags, Trash2, Upload } from "lucide-react";

import { hasRole, useAuth } from "@/components/auth/auth-provider";
import { PageHeader, RoleGate, StatusBadge } from "@/components/common";
import { ExportMenu } from "@/components/export-menu";
import { BulkActions } from "@/components/tables/bulk-actions";
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
  const [selected, setSelected] = useState([]);
  const [refresh, setRefresh] = useState(0);
  const bulkActions = [
    ...BULK_ACTIONS,
    ...(hasRole(user, "ADMIN") ? [DELETE_ACTION] : []),
  ];

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
        selectable={canManage}
        selectedIds={selected}
        onSelectionChange={setSelected}
        rowLabel={(row) => `${row.student_number} ${row.full_name}`}
        refreshKey={refresh}
        filters={[
          { key: "programme", label: "Programme", endpoint: "/programmes/", optionLabel: (p) => p.code },
          { key: "level", label: "Level", endpoint: "/levels/" },
          { key: "status", label: "Status", options: STUDENT_STATUS_OPTIONS },
          { key: "admission_year", label: "Admission year", options: yearOptions() },
        ]}
      />
      {canManage && (
        <BulkActions
          endpoint="/students/bulk/"
          noun="student"
          selectedIds={selected}
          onClear={() => setSelected([])}
          onDone={(stillSelected) => {
            setSelected(stillSelected);
            setRefresh((n) => n + 1);
          }}
          actions={bulkActions}
          statusOptions={STUDENT_STATUS_OPTIONS}
        />
      )}
    </RoleGate>
  );
}

const plural = (n) => `${n} student${n === 1 ? "" : "s"}`;

const BULK_ACTIONS = [
  {
    value: "change_status",
    label: "Change status",
    icon: Tags,
    needsStatus: true,
    confirm: (n) => `Set a new status for ${plural(n)}. Students who already have that status are skipped.`,
    done: (n) => `Status changed for ${plural(n)}.`,
  },
  {
    value: "deactivate",
    label: "Deactivate",
    icon: PowerOff,
    confirm: (n) => `${plural(n)} will be unable to sign in. Their records and results are kept and this can be undone.`,
    done: (n) => `${plural(n)} deactivated.`,
  },
  {
    value: "activate",
    label: "Reactivate",
    icon: Power,
    confirm: (n) => `${plural(n)} will be able to sign in again.`,
    done: (n) => `${plural(n)} reactivated.`,
  },
];

const DELETE_ACTION = {
  value: "delete",
  label: "Delete",
  icon: Trash2,
  destructive: true,
  confirm: (n) =>
    `Permanently delete ${plural(n)} created in error, for example duplicates from a bad import. Only records that ` +
    "have never been used can be deleted: anyone with registrations, results, status changes or a sign-in is skipped " +
    "and should be deactivated instead.",
  done: (n) => `${plural(n)} deleted.`,
};

function yearOptions() {
  const current = new Date().getFullYear();
  return Array.from({ length: 8 }, (_, i) => String(current - i)).map((y) => ({ value: y, label: y }));
}
