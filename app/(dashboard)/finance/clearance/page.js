"use client";

import { useState } from "react";
import { AlertTriangle, BadgeCheck, Ban, CheckCircle2, Download, FileUp, Loader2, Users, X } from "lucide-react";
import { toast } from "sonner";

import { hasRole, useAuth } from "@/components/auth/auth-provider";
import { PageHeader, RoleGate, StatCard, StatusBadge } from "@/components/common";
import { Field } from "@/components/forms/field";
import { DataTable } from "@/components/tables/data-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const students = (n) => `${n} student${n === 1 ? "" : "s"}`;

export default function FinancialClearancePage() {
  const { user } = useAuth();
  const canEdit = hasRole(user, "ADMIN", "ACCOUNTS_OFFICER");
  const [query, setQuery] = useState({});
  const semester = query.semester || "";
  const { data: summary, reload: reloadSummary } = useApi("/financial-clearances/summary/", semester ? { semester } : {});
  const [selected, setSelected] = useState([]);
  const [deciding, setDeciding] = useState(null);
  const [importing, setImporting] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const changed = () => {
    setRefresh((n) => n + 1);
    reloadSummary();
  };

  const columns = [
    { key: "student_number", header: "Student no.", cell: (r) => <span className="font-medium">{r.student_number}</span> },
    { key: "full_name", header: "Name" },
    { key: "programme_code", header: "Programme" },
    { key: "level_name", header: "Level" },
    {
      key: "cleared",
      header: "Clearance",
      cell: (r) => <StatusBadge status={r.cleared ? "ACTIVE" : "PENDING"} label={r.cleared ? "Cleared" : "Not cleared"} />,
    },
    {
      key: "note",
      header: "Note",
      className: "max-w-72",
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.note || "—"}
          {r.decided_at && <span className="block">{formatDateTime(r.decided_at)}</span>}
        </span>
      ),
    },
  ];

  return (
    <RoleGate roles={["ADMIN", "ACCOUNTS_OFFICER", "REGISTRAR"]}>
      <PageHeader
        title="Financial clearance"
        description="Who may register this semester. Students who have paid enough are cleared automatically; you can clear or revoke anyone here, for example for a payment plan or sponsor."
        actions={
          canEdit && (
            <Button variant="outline" onClick={() => setImporting(true)}>
              <FileUp /> Import from spreadsheet
            </Button>
          )
        }
      />
      {summary && !summary.required && (
        <Alert variant="warning" className="mb-4">
          <AlertTitle>Clearance is not enforced yet</AlertTitle>
          <AlertDescription>
            Students can register without clearance until an administrator turns on &ldquo;Students must be financially cleared
            before registering&rdquo; in Institution settings. You can record clearances in advance.
          </AlertDescription>
        </Alert>
      )}
      {summary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatCard label={`Students who may register · ${summary.semester.name}`} value={summary.total} icon={Users} tone="brand" />
          <StatCard label="Cleared" value={summary.cleared} icon={CheckCircle2} tone="green" />
          <StatCard label="Not yet cleared" value={summary.not_cleared} icon={AlertTriangle} tone="amber" />
        </div>
      )}
      <DataTable
        endpoint="/financial-clearances/"
        columns={columns}
        searchPlaceholder="Search student number or name…"
        refreshKey={refresh}
        onData={(_, params) => setQuery(params)}
        selectable={canEdit}
        selectedIds={selected}
        onSelectionChange={setSelected}
        rowLabel={(r) => `${r.student_number} ${r.full_name}`}
        pageSize={50}
        filters={[
          { key: "semester", label: "Semester (default: current)", endpoint: "/semesters/", optionLabel: (s) => `${s.academic_year_name} ${s.name}` },
          { key: "cleared", label: "Clearance", options: [{ value: "false", label: "Not cleared" }, { value: "true", label: "Cleared" }] },
          { key: "programme", label: "Programme", endpoint: "/programmes/", optionLabel: (p) => p.code },
          { key: "level", label: "Level", endpoint: "/levels/" },
        ]}
        emptyTitle="No students found"
      />
      {canEdit && selected.length > 0 && (
        <div
          role="region"
          aria-label="Clearance actions"
          className="sticky bottom-4 z-30 mx-auto mt-4 flex w-fit max-w-full flex-wrap items-center gap-2 rounded-xl border bg-background/95 p-2 pl-4 shadow-lg backdrop-blur"
        >
          <span className="text-sm font-medium tabular-nums">{students(selected.length)} selected</span>
          <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
            <X /> Clear
          </Button>
          <Button size="sm" onClick={() => setDeciding(true)}>
            <BadgeCheck /> Mark cleared
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeciding(false)}>
            <Ban /> Revoke clearance
          </Button>
        </div>
      )}
      {deciding !== null && (
        <DecideDialog
          cleared={deciding}
          ids={selected}
          semester={semester || summary?.semester.id}
          onClose={() => setDeciding(null)}
          onDone={() => {
            setDeciding(null);
            setSelected([]);
            changed();
          }}
        />
      )}
      {importing && (
        <ImportDialog
          semester={semester || summary?.semester.id}
          semesterName={summary?.semester.name}
          onClose={() => setImporting(false)}
          onDone={changed}
        />
      )}
    </RoleGate>
  );
}

function DecideDialog({ cleared, ids, semester, onClose, onDone }) {
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setPending(true);
    setError("");
    try {
      const { data } = await api.post("/financial-clearances/set/", { semester: Number(semester), students: ids, cleared, note });
      toast.success(cleared ? `${students(data.changed)} cleared. They have been told they can register.` : `Clearance revoked for ${students(data.changed)}.`);
      onDone();
    } catch (e) {
      setError(fieldErrors(e).note || errorMessage(e));
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cleared ? `Clear ${students(ids.length)}?` : `Revoke clearance for ${students(ids.length)}?`}</DialogTitle>
          <DialogDescription>
            {cleared
              ? "They can register for the semester and are notified in the app."
              : "They cannot register until cleared again. A registration they already made is kept."}
          </DialogDescription>
        </DialogHeader>
        <Field id="clearance-note" label={cleared ? "Note" : "Reason"} required={!cleared} error={error}
               hint={cleared ? "Optional: receipt number, payment plan or sponsor." : "Recorded in the audit log."}>
          <Input id="clearance-note" value={note} maxLength={255} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant={cleared ? "default" : "destructive"} onClick={save} disabled={pending || (!cleared && !note.trim())}>
            {pending && <Loader2 className="animate-spin" />}
            {cleared ? "Mark cleared" : "Revoke"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({ semester, semesterName, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function upload() {
    setPending(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("semester", semester);
      const { data } = await api.post("/financial-clearances/import/", form);
      setResult(data);
      onDone();
    } catch (e) {
      setError(fieldErrors(e).file || errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import clearances{semesterName ? ` · ${semesterName}` : ""}</DialogTitle>
          <DialogDescription>
            A CSV or Excel file exported from your accounting system with a <code>student_number</code> column, and optionally
            <code> cleared</code> (yes/no, default yes) and <code>note</code>.
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <Alert variant="success">
            <AlertTitle>
              {students(result.cleared)} cleared, {students(result.not_cleared)} not cleared
            </AlertTitle>
            <AlertDescription>
              {result.unknown.length
                ? `Not found: ${result.unknown.slice(0, 20).join(", ")}${result.unknown.length > 20 ? "…" : ""}`
                : "Every student number was found."}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            <Field id="clearance-file" label="File" error={error}>
              <Input id="clearance-file" type="file" accept=".csv,.xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>
            <Button variant="link" size="sm" className="h-auto p-0" asChild>
              <a href="/api/v1/financial-clearances/template/" download>
                <Download /> Download a template
              </a>
            </Button>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button onClick={upload} disabled={pending || !file || !semester}>
              {pending && <Loader2 className="animate-spin" />}
              Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
