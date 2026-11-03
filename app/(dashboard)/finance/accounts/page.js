"use client";

import { PageHeader, RoleGate, StatusBadge } from "@/components/common";
import { DataTable } from "@/components/tables/data-table";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function StudentAccountsPage() {
  const columns = [
    { key: "student_number", header: "Student no.", cell: (r) => <span className="font-medium">{r.student_number}</span> },
    { key: "full_name", header: "Name" },
    { key: "programme_code", header: "Programme" },
    { key: "level_name", header: "Level" },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "balance",
      header: "Balance",
      sortKey: "balance",
      className: "text-right",
      cell: (r) => {
        const owed = Number(r.balance);
        return (
          <span className={cn("tabular-nums", owed > 0 ? "font-medium" : "text-emerald-600 dark:text-emerald-400")}>
            {owed < 0 ? `${formatMoney(-owed)} credit` : formatMoney(owed)}
          </span>
        );
      },
    },
  ];
  return (
    <RoleGate roles={["ADMIN", "ACCOUNTS_OFFICER"]}>
      <PageHeader title="Student accounts" description="Each student's fees balance. Open a student to see the statement, record a payment or give a waiver." />
      <DataTable
        endpoint="/student-accounts/"
        columns={columns}
        searchPlaceholder="Search student number or name…"
        rowHref={(r) => `/finance/accounts/${r.id}`}
        pageSize={50}
        filters={[
          { key: "owing", label: "Balance", options: [{ value: "true", label: "Owing" }, { value: "false", label: "Paid up or in credit" }] },
          { key: "programme", label: "Programme", endpoint: "/programmes/", optionLabel: (p) => p.code },
          { key: "level", label: "Level", endpoint: "/levels/" },
        ]}
        emptyTitle="No students found"
      />
    </RoleGate>
  );
}
