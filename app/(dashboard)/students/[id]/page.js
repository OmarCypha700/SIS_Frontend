"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowRightLeft, FileText, Loader2, Pencil, Power, Tag } from "lucide-react";
import { toast } from "sonner";

import { hasRole, useAuth } from "@/components/auth/auth-provider";
import {
  ConfirmDialog, DescriptionList, EmptyState, ErrorState, LoadingBlock, PageHeader, RoleGate, StatusBadge,
} from "@/components/common";
import { Field, NativeSelect } from "@/components/forms/field";
import { AcademicRecord } from "@/components/results/academic-record";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";
import { STUDENT_STATUS_OPTIONS } from "@/lib/options";

const GENDERS = { F: "Female", M: "Male", O: "Other", U: "Prefer not to say" };

export default function StudentDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canManage = hasRole(user, "ADMIN", "REGISTRAR");
  const { data: student, error, loading, reload, setData } = useApi(`/students/${id}/`);
  const [dialog, setDialog] = useState(null);

  if (loading && !student) return <LoadingBlock rows={8} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const isFullRecord = "date_of_birth" in student;

  return (
    <RoleGate roles={["ADMIN", "REGISTRAR", "RESULTS_OFFICER", "LECTURER"]}>
      <PageHeader
        title={student.full_name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {student.student_number} · {student.programme_code} · {student.level_name}
            <StatusBadge status={student.status} />
            {student.academic_standing === "PROBATION" && <StatusBadge status="PROBATION" label="On probation" />}
            {student.is_active === false && <StatusBadge status="CANCELLED" label="Account disabled" />}
          </span>
        }
        actions={
          canManage && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/students/${id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setDialog("status")}>
                <Tag /> Change status
              </Button>
              <Button variant="outline" onClick={() => setDialog("placement")}>
                <ArrowRightLeft /> Programme / level
              </Button>
              <Button variant={student.is_active ? "destructive" : "outline"} onClick={() => setDialog("active")}>
                <Power /> {student.is_active ? "Deactivate" : "Re-activate"}
              </Button>
            </>
          )
        }
      />
      <Tabs defaultValue="profile">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {canManage && <TabsTrigger value="history">Placement history</TabsTrigger>}
          {canManage && <TabsTrigger value="registrations">Registrations</TabsTrigger>}
          {hasRole(user, "ADMIN", "REGISTRAR", "RESULTS_OFFICER") && <TabsTrigger value="results">Academic record</TabsTrigger>}
        </TabsList>
        <TabsContent value="profile">
          <Card>
            <CardContent>
              <DescriptionList
                className="lg:grid-cols-3"
                items={[
                  { label: "Student number", value: student.student_number },
                  { label: "Email", value: student.email },
                  { label: "Programme", value: student.programme_name || student.programme_code },
                  { label: "Level", value: student.level_name },
                  ...(isFullRecord
                    ? [
                        { label: "Telephone", value: student.phone },
                        { label: "Date of birth", value: formatDate(student.date_of_birth) },
                        { label: "Gender", value: GENDERS[student.gender] },
                        { label: "Admission year", value: student.admission_year },
                        { label: "Admission date", value: formatDate(student.admission_date) },
                        { label: "Residential address", value: student.residential_address },
                        {
                          label: "Emergency contact",
                          value: student.emergency_contact_name
                            ? `${student.emergency_contact_name} (${student.emergency_contact_relationship || "—"}) ${student.emergency_contact_phone}`
                            : null,
                        },
                        { label: "Record created", value: formatDateTime(student.created_at) },
                        { label: "Last updated", value: formatDateTime(student.updated_at) },
                      ]
                    : []),
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
        {canManage && (
          <TabsContent value="history">
            <PlacementHistory studentId={id} key={student.updated_at} />
          </TabsContent>
        )}
        {canManage && (
          <TabsContent value="registrations">
            <DataTable
              endpoint="/registrations/"
              params={{ student: id }}
              searchable={false}
              rowHref={(r) => `/registrations/${r.id}`}
              columns={[
                { key: "semester_name", header: "Semester" },
                { key: "level_name", header: "Level" },
                { key: "course_count", header: "Courses" },
                { key: "total_credits", header: "Credits" },
                { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} label={r.status_display} /> },
                { key: "submitted_at", header: "Submitted", cell: (r) => formatDateTime(r.submitted_at) },
              ]}
              emptyTitle="No registrations"
            />
          </TabsContent>
        )}
        <TabsContent value="results">
          <StudentRecordTab studentId={id} />
        </TabsContent>
      </Tabs>

      {canManage && (
        <>
          <StatusDialog open={dialog === "status"} onOpenChange={(o) => !o && setDialog(null)} student={student} onSaved={setData} />
          <PlacementDialog open={dialog === "placement"} onOpenChange={(o) => !o && setDialog(null)} student={student} onSaved={setData} />
          <ConfirmDialog
            open={dialog === "active"}
            onOpenChange={(o) => !o && setDialog(null)}
            title={student.is_active ? "Deactivate this student?" : "Re-activate this student?"}
            description={
              student.is_active
                ? "The student will no longer be able to sign in. Their record and academic history are kept."
                : "The student will be able to sign in again."
            }
            confirmLabel={student.is_active ? "Deactivate" : "Re-activate"}
            destructive={student.is_active}
            requireReason
            onConfirm={async (reason) => {
              try {
                const response = await api.post(`/students/${id}/${student.is_active ? "deactivate" : "activate"}/`, { reason });
                setData(response.data);
                toast.success("Account updated.");
              } catch (e) {
                toast.error(errorMessage(e));
                throw e;
              }
            }}
          />
        </>
      )}
    </RoleGate>
  );
}

function PlacementHistory({ studentId }) {
  const { data, error, loading, reload } = useApi(`/students/${studentId}/history/`);
  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data.length) return <EmptyState title="No history recorded" />;
  return (
    <Card>
      <CardContent>
        <ol className="relative space-y-5 border-l pl-6">
          {data.map((entry) => (
            <li key={entry.id}>
              <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-background bg-primary" />
              <p className="text-sm font-medium">
                {titleCase(entry.change_type)}
                {entry.change_type === "STATUS" && `: ${titleCase(entry.from_status) || "—"} → ${titleCase(entry.to_status)}`}
                {["PROGRAMME", "LEVEL", "ADMISSION"].includes(entry.change_type) &&
                  `: ${[entry.from_programme_code, entry.from_level_name].filter(Boolean).join(" ") || "—"} → ${[entry.to_programme_code, entry.to_level_name].filter(Boolean).join(" ")}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(entry.created_at)} · {entry.changed_by_name || "System"}
              </p>
              {entry.reason && <p className="mt-1 text-sm">{entry.reason}</p>}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function StudentRecordTab({ studentId }) {
  const { data, error, loading, reload } = useApi(`/students/${studentId}/academic-record/`);
  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          CGPA <strong className="text-foreground">{data.summary.cgpa ?? "—"}</strong> · Credits earned{" "}
          <strong className="text-foreground">{data.summary.credits_earned}</strong>
          {data.summary.required_credits ? ` of ${data.summary.required_credits}` : ""}
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/students/${studentId}/transcript`}>
            <FileText /> Printable transcript
          </Link>
        </Button>
      </div>
      <AcademicRecord record={data} />
    </div>
  );
}

function StatusDialog({ open, onOpenChange, student, onSaved }) {
  const [status, setStatus] = useState(student.status);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  async function save() {
    setPending(true);
    try {
      const response = await api.post(`/students/${student.id}/change-status/`, { status, reason });
      onSaved(response.data);
      toast.success("Status updated.");
      setReason("");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change academic status</DialogTitle>
          <DialogDescription>The status controls whether the student can register and view results.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field id="new-status" label="New status" required>
            <NativeSelect id="new-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STUDENT_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="status-reason" label="Reason" required>
            <Textarea id="status-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending || !reason.trim() || status === student.status}>
            {pending && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlacementDialog({ open, onOpenChange, student, onSaved }) {
  const { data: programmes } = useApi(open ? "/programmes/" : null, { page_size: 200, is_active: true });
  const { data: levels } = useApi(open ? "/levels/" : null);
  const [programme, setProgramme] = useState(String(student.programme));
  const [level, setLevel] = useState(String(student.current_level));
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  async function save() {
    setPending(true);
    try {
      const response = await api.post(`/students/${student.id}/change-placement/`, {
        programme: Number(programme), current_level: Number(level), reason,
      });
      onSaved(response.data);
      toast.success("Programme and level updated.");
      setReason("");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change programme or level</DialogTitle>
          <DialogDescription>The previous placement is kept in the student&apos;s history.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field id="placement-programme" label="Programme" required>
            <NativeSelect id="placement-programme" value={programme} onChange={(e) => setProgramme(e.target.value)}>
              {(programmes?.results ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} – {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="placement-level" label="Level" required>
            <NativeSelect id="placement-level" value={level} onChange={(e) => setLevel(e.target.value)}>
              {(levels ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="placement-reason" label="Reason" required>
            <Textarea id="placement-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
