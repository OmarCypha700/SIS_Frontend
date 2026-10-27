"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { hasRole, useAuth } from "@/components/auth/auth-provider";
import { ConfirmDialog, PageHeader, RoleGate, StatusBadge } from "@/components/common";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "APPLIED", label: "Applied" },
  { value: "REJECTED", label: "Rejected" },
];

export default function AmendmentsPage() {
  const { user } = useAuth();
  const canReview = user.capabilities.can_approve_amendments;
  const [reviewing, setReviewing] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const columns = [
    {
      key: "student",
      header: "Student",
      cell: (r) => (
        <>
          <span className="font-medium">{r.student_number}</span>
          <span className="block text-xs text-muted-foreground">{r.student_name}</span>
        </>
      ),
    },
    { key: "course_code", header: "Course", cell: (r) => `${r.course_code} · ${r.semester_name}` },
    { key: "change", header: "Change", cell: (r) => <span className="tabular-nums">{r.original_total} ({r.original_grade}) → {r.new_total} ({r.new_grade})</span> },
    { key: "reason", header: "Reason", className: "max-w-72", cell: (r) => <span className="line-clamp-2">{r.reason}</span> },
    { key: "requested_by_name", header: "Requested", cell: (r) => <span className="text-sm">{r.requested_by_name}<span className="block text-xs text-muted-foreground">{formatDateTime(r.created_at)}</span></span> },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <span>
          <StatusBadge status={r.status} label={r.status_display} />
          {r.reviewed_by_name && <span className="mt-1 block text-xs text-muted-foreground">by {r.reviewed_by_name}</span>}
        </span>
      ),
    },
    ...(canReview
      ? [{
          key: "actions",
          header: <span className="sr-only">Actions</span>,
          className: "text-right",
          cell: (r) =>
            r.status === "PENDING" && (
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="outline" onClick={() => setReviewing({ row: r, approve: false })}>
                  <X /> Reject
                </Button>
                <Button size="sm" onClick={() => setReviewing({ row: r, approve: true })}>
                  <Check /> Approve
                </Button>
              </div>
            ),
        }]
      : []),
  ];

  return (
    <RoleGate roles={["ADMIN", "REGISTRAR", "RESULTS_OFFICER", "LECTURER"]}>
      <PageHeader
        title="Result amendments"
        description={
          hasRole(user, "LECTURER")
            ? "Amendments you requested for your courses. Request one from a published result sheet."
            : "Changes to published results require a reason and separate approval. Approved amendments are applied immediately and logged."
        }
      />
      <DataTable
        endpoint="/result-amendments/"
        columns={columns}
        refreshKey={refresh}
        searchPlaceholder="Search student or course…"
        filters={[{ key: "status", label: "Status", options: STATUS_OPTIONS }]}
        emptyTitle="No amendments"
      />
      <ConfirmDialog
        open={reviewing !== null}
        onOpenChange={(open) => !open && setReviewing(null)}
        title={reviewing?.approve ? "Approve and apply this amendment?" : "Reject this amendment?"}
        description={
          reviewing &&
          `${reviewing.row.student_number} ${reviewing.row.course_code}: ${reviewing.row.original_grade} → ${reviewing.row.new_grade}. ${reviewing.approve ? "The published result changes immediately." : ""}`
        }
        confirmLabel={reviewing?.approve ? "Approve" : "Reject"}
        destructive={!reviewing?.approve}
        requireReason
        reasonLabel="Comment"
        reasonOptional={reviewing?.approve}
        onConfirm={async (comment) => {
          try {
            await api.post(`/result-amendments/${reviewing.row.id}/review/`, { approve: reviewing.approve, comment });
            toast.success(reviewing.approve ? "Amendment applied." : "Amendment rejected.");
            setRefresh((n) => n + 1);
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
    </RoleGate>
  );
}
