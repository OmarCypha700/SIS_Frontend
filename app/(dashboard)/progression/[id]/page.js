"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowUpCircle, CheckCheck, CircleDashed, ListRestart, Loader2, MoreHorizontal, Pencil, RefreshCw, Repeat, ShieldAlert, ShieldCheck,
  TriangleAlert, UserMinus, UserPlus, UserPen, Users,
} from "lucide-react";
import { toast } from "sonner";

import { hasRole, useAuth } from "@/components/auth/auth-provider";
import { ConfirmDialog, ErrorState, LoadingBlock, PageHeader, RoleGate, StatCard, StatusBadge } from "@/components/common";
import { Field, NativeSelect } from "@/components/forms/field";
import { DataTable } from "@/components/tables/data-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { PLACEMENT_LABELS, STANDING_LABELS } from "@/lib/options";

const toOptions = (labels) => Object.entries(labels).map(([value, label]) => ({ value, label }));

export default function ProgressionReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { data: review, error, loading, reload, setData } = useApi(`/progression-reviews/${id}/`);
  const [refresh, setRefresh] = useState(0);
  const [editing, setEditing] = useState(null);
  const [excluding, setExcluding] = useState(null);
  const [confirm, setConfirm] = useState(null);

  if (loading && !review) return <LoadingBlock rows={8} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const canEdit = hasRole(user, "ADMIN", "REGISTRAR") && review.status === "DRAFT";
  const s = review.summary;
  const refreshAll = () => {
    reload();
    setRefresh((n) => n + 1);
  };

  const columns = [
    {
      key: "student",
      header: "Student",
      cell: (r) => (
        <Link href={`/students/${r.student}`} className="hover:underline">
          <span className="font-medium">{r.student_name}</span>
          <span className="block text-xs text-muted-foreground">
            {r.student_number} · {r.programme_code} · {r.level_name}
          </span>
        </Link>
      ),
    },
    { key: "cgpa", header: "CGPA", sortKey: "cgpa", cell: (r) => <span className="tabular-nums">{r.cgpa ?? "—"}</span> },
    { key: "semester_gpa", header: "GPA", cell: (r) => <span className="tabular-nums">{r.semester_gpa ?? "—"}</span> },
    {
      key: "credits",
      header: "Credits (year / failed)",
      cell: (r) => <span className="tabular-nums">{r.credits_earned_year} / {r.outstanding_failed_credits}</span>,
    },
    {
      key: "outcome",
      header: "Outcome",
      cell: (r) => (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-1">
            <StatusBadge status={r.final_standing} label={STANDING_LABELS[r.final_standing]} />
            {r.final_standing !== "DISMISS" && <StatusBadge status={r.final_placement} label={PLACEMENT_LABELS[r.final_placement]} />}
            {r.excluded && <StatusBadge status="CANCELLED" label="Excluded" />}
            {!r.results_complete && <StatusBadge status="PENDING" label="Provisional" />}
            {r.applied && <StatusBadge status="PUBLISHED" label="Applied" />}
          </div>
          {r.is_overridden && (
            <p className="text-xs text-muted-foreground">
              Proposed: {STANDING_LABELS[r.proposed_standing]}, {PLACEMENT_LABELS[r.proposed_placement]}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "reasons",
      header: "Why",
      className: "max-w-96",
      cell: (r) => (
        <div className="space-y-0.5 text-xs">
          {r.reasons.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
          {r.override_reason && <p className="font-medium">Registry: {r.override_reason}</p>}
        </div>
      ),
    },
    ...(canEdit
      ? [{
          key: "actions",
          header: <span className="sr-only">Actions</span>,
          className: "w-12 text-right",
          cell: (r) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${r.student_name}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditing(r)}>
                  <Pencil /> Change outcome
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setExcluding(r)}>
                  {r.excluded ? <UserPlus /> : <UserMinus />} {r.excluded ? "Include again" : "Exclude from review"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ),
        }]
      : []),
  ];

  async function run(name) {
    try {
      if (name === "follow_up") {
        const response = await api.post("/progression-reviews/generate/", { semester: review.semester, follow_up: true });
        toast.success(`Follow-up review prepared for ${response.data.summary.students} student(s).`);
        router.push(`/progression/${response.data.id}`);
        return;
      }
      if (name === "apply") {
        // Outstanding work is listed on the page and in the confirmation, so confirming acknowledges it.
        const response = await api.post(`/progression-reviews/${id}/apply/`, {
          acknowledge_outstanding: review.outstanding.length > 0,
        });
        setData(response.data);
        const c = response.data.applied_counts;
        toast.success(`Applied to ${c.applied} student(s). ${c.skipped_incomplete} provisional and ${c.excluded} excluded were left unchanged.`);
      } else {
        const response = await api.post("/progression-reviews/generate/", { semester: review.semester });
        setData(response.data);
        toast.success("Proposals recalculated. Registry changes were kept.");
      }
      setRefresh((n) => n + 1);
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  }

  return (
    <RoleGate roles={["ADMIN", "REGISTRAR", "RESULTS_OFFICER"]}>
      <PageHeader
        title={`${review.is_follow_up ? `Follow-up review ${review.sequence - 1}` : "Progression review"} · ${review.semester_name}`}
        description={
          review.status === "APPLIED"
            ? `Applied ${formatDateTime(review.applied_at)} by ${review.applied_by_name}.`
            : "Draft: nothing has been changed on any student record yet."
        }
        actions={
          canEdit ? (
            <>
              <Button variant="outline" onClick={() => setConfirm("regenerate")}>
                <RefreshCw /> Recalculate
              </Button>
              <Button onClick={() => setConfirm("apply")}>
                <CheckCheck /> Apply review
              </Button>
            </>
          ) : (
            review.can_follow_up &&
            hasRole(user, "ADMIN", "REGISTRAR") && (
              <Button variant="outline" onClick={() => setConfirm("follow_up")}>
                <ListRestart /> Start follow-up review
              </Button>
            )
          )
        }
      />
      {review.is_follow_up && (
        <Alert className="mb-4">
          <ListRestart />
          <AlertTitle>Follow-up review</AlertTitle>
          <AlertDescription>
            Only students whose outcome arrived after the earlier review was applied are listed: those who were provisional or
            excluded, and those not promoted whose result has since changed (a resit or deferred examination, a late result, an
            amendment). Students already promoted or dismissed are not reconsidered here.
          </AlertDescription>
        </Alert>
      )}
      {review.status === "DRAFT" && review.outstanding.length > 0 && (
        <Alert variant="warning" className="mb-4">
          <TriangleAlert />
          <AlertTitle>Outcomes for this semester can still change</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4">
              {review.outstanding.map((item) => (
                <li key={item.kind}>{item.message}</li>
              ))}
            </ul>
            Students affected are marked provisional and left unchanged. Apply now only if you need to; once these finish,
            start a follow-up review to apply their outcomes.
          </AlertDescription>
        </Alert>
      )}
      {!review.is_final_term && (
        <Alert className="mb-4">
          <AlertTitle>Mid-year review</AlertTitle>
          <AlertDescription>
            This is not the last term of the academic year, so promotion is not considered. Probation and dismissal rules still apply.
          </AlertDescription>
        </Alert>
      )}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Students", s.students, Users, "brand"],
          ["Good standing", s.good, ShieldCheck, "green"],
          ["Probation", s.probation, ShieldAlert, "amber"],
          ["Dismissal", s.dismiss, UserMinus, "red"],
          ["Promote", s.promote, ArrowUpCircle, "green"],
          ["Repeat level", s.repeat, Repeat, "amber"],
          ["Changed by registry", s.overridden, UserPen, "violet"],
          ["Provisional", s.incomplete, CircleDashed, "blue"],
        ].map(([label, value, icon, tone]) => (
          <StatCard key={label} label={label} value={value} icon={icon} tone={tone} />
        ))}
      </div>
      <DataTable
        endpoint="/progression-decisions/"
        params={{ review: id }}
        refreshKey={refresh}
        columns={columns}
        searchPlaceholder="Search student…"
        defaultOrdering="student__last_name"
        filters={[
          { key: "final_standing", label: "Standing", options: toOptions(STANDING_LABELS) },
          { key: "final_placement", label: "Placement", options: toOptions(PLACEMENT_LABELS) },
          { key: "results_complete", label: "Results", options: [{ value: "true", label: "Complete" }, { value: "false", label: "Provisional" }] },
          { key: "excluded", label: "Excluded", options: [{ value: "false", label: "Included" }, { value: "true", label: "Excluded" }] },
        ]}
        emptyTitle="No students in this review"
        emptyDescription="Only active students with an approved registration for the semester are reviewed."
      />
      {editing && <OverrideDialog decision={editing} onClose={() => setEditing(null)} onSaved={refreshAll} />}
      <ConfirmDialog
        open={excluding !== null}
        onOpenChange={(o) => !o && setExcluding(null)}
        title={excluding?.excluded ? "Include this student again?" : "Exclude this student from the review?"}
        description="Excluded students are left unchanged when the review is applied."
        confirmLabel={excluding?.excluded ? "Include" : "Exclude"}
        requireReason
        reasonOptional={excluding?.excluded}
        onConfirm={async (reason) => {
          try {
            await api.post(`/progression-decisions/${excluding.id}/exclude/`, { excluded: !excluding.excluded, reason });
            refreshAll();
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={{ apply: "Apply this progression review?", regenerate: "Recalculate the proposals?", follow_up: "Start a follow-up review?" }[confirm]}
        description={
          {
            apply: `This promotes students, records probation, sets repeats and dismisses students as shown (${s.dismiss} dismissal(s)). Provisional and excluded students are not changed. Each change is recorded in the student's history and the audit log. This cannot be undone from this page.${review.outstanding.length ? ` Still outstanding: ${review.outstanding.map((o) => o.message).join(" ")}` : ""}`,
            regenerate: "Proposals are recomputed from the current results and regulations. Outcomes you have changed are kept.",
            follow_up: "Prepares a review of students whose outcome arrived after this one was applied. Nothing changes until you apply it.",
          }[confirm]
        }
        confirmLabel={{ apply: "Apply review", regenerate: "Recalculate", follow_up: "Prepare follow-up" }[confirm]}
        destructive={confirm === "apply" && s.dismiss > 0}
        onConfirm={() => run(confirm)}
      />
    </RoleGate>
  );
}

function OverrideDialog({ decision, onClose, onSaved }) {
  const [standing, setStanding] = useState(decision.final_standing);
  const [placement, setPlacement] = useState(decision.final_placement);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  async function save() {
    setPending(true);
    try {
      await api.post(`/progression-decisions/${decision.id}/override/`, { standing, placement, reason });
      toast.success("Outcome changed.");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
      setPending(false);
    }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change outcome for {decision.student_name}</DialogTitle>
          <DialogDescription>
            Proposed: {STANDING_LABELS[decision.proposed_standing]}, {PLACEMENT_LABELS[decision.proposed_placement]}. Record why
            the registry is deciding differently, for example an Academic Board decision.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="override-standing" label="Standing">
            <NativeSelect id="override-standing" value={standing} onChange={(e) => setStanding(e.target.value)}>
              {toOptions(STANDING_LABELS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="override-placement" label="Placement">
            <NativeSelect id="override-placement" value={placement} disabled={standing === "DISMISS"} onChange={(e) => setPlacement(e.target.value)}>
              {toOptions(PLACEMENT_LABELS).map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="override-reason" label="Reason" required className="sm:col-span-2">
            <Textarea id="override-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending || !reason.trim()}>
            {pending && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
