"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { hasRole, useAuth } from "@/components/auth/auth-provider";
import { PageHeader, RoleGate, StatusBadge } from "@/components/common";
import { Field, NativeSelect } from "@/components/forms/field";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const COLUMNS = [
  { key: "semester_name", header: "Semester", cell: (r) => <span className="font-medium">{r.semester_name}</span> },
  { key: "is_final_term", header: "Promotion considered", cell: (r) => (r.is_final_term ? "Yes (end of year)" : "No") },
  { key: "decision_count", header: "Students" },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status === "APPLIED" ? "PUBLISHED" : "DRAFT"} label={r.status_display} /> },
  { key: "applied", header: "Applied", cell: (r) => (r.applied_at ? `${formatDateTime(r.applied_at)} by ${r.applied_by_name}` : "—") },
];

export default function ProgressionReviewsPage() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <RoleGate roles={["ADMIN", "REGISTRAR", "RESULTS_OFFICER"]}>
      <PageHeader
        title="Progression reviews"
        description="At the end of a semester the system proposes each student's standing and level from the academic regulations. The registry reviews and applies them."
        actions={
          hasRole(user, "ADMIN", "REGISTRAR") && (
            <Button onClick={() => setOpen(true)}>
              <Plus /> New review
            </Button>
          )
        }
      />
      <DataTable endpoint="/progression-reviews/" columns={COLUMNS} searchable={false} rowHref={(r) => `/progression/${r.id}`}
        emptyTitle="No progression reviews yet" />
      {open && <GenerateDialog onClose={() => setOpen(false)} />}
    </RoleGate>
  );
}

function GenerateDialog({ onClose }) {
  const router = useRouter();
  const { data } = useApi("/semesters/", { page_size: 100 });
  const [semester, setSemester] = useState("");
  const [pending, setPending] = useState(false);
  async function generate() {
    setPending(true);
    try {
      const response = await api.post("/progression-reviews/generate/", { semester: Number(semester) });
      toast.success(`Review prepared for ${response.data.decision_count} student(s). Nothing has been applied yet.`);
      router.push(`/progression/${response.data.id}`);
    } catch (e) {
      toast.error(errorMessage(e));
      setPending(false);
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prepare a progression review</DialogTitle>
          <DialogDescription>
            Run this after the semester&apos;s results (and any resits) are published. Students with unpublished results are marked
            provisional and are not changed when the review is applied.
          </DialogDescription>
        </DialogHeader>
        <Field id="review-semester" label="Semester" required>
          <NativeSelect id="review-semester" value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="">Select…</option>
            {(data?.results ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.academic_year_name} {s.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={generate} disabled={!semester || pending}>
            {pending && <Loader2 className="animate-spin" />}
            Prepare review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
