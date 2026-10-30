"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, Eye, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingBlock, PageHeader, RoleGate, StatusBadge } from "@/components/common";
import { Field, NativeSelect } from "@/components/forms/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";

const OUTCOMES = {
  ready: { status: "APPROVED", label: "Ready" },
  registered: { status: "ACTIVE", label: "Registered" },
  unchanged: { status: "COMPLETED", label: "Nothing to add" },
  problem: { status: "REJECTED", label: "Problem" },
  pending: { status: "PENDING", label: "Awaiting approval" },
  blocked: { status: "SUSPENDED", label: "Cannot register" },
};

const list = (data) => (Array.isArray(data) ? data : (data?.results ?? []));

function chunks(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export default function BulkRegistrationPage() {
  const [cohort, setCohort] = useState({ semester: "", programme: "", level: "" });
  const [loaded, setLoaded] = useState(null);
  return (
    <RoleGate roles={["ADMIN", "REGISTRAR"]}>
      <PageHeader
        title="Bulk registration"
        description="Register a whole class at once. Each student gets their own compulsory courses for the semester, plus any electives you choose. Every student is checked against the same rules as a single registration, and nothing they already registered for is dropped."
      />
      <CohortPicker
        value={cohort}
        onChange={(next) => {
          setCohort(next);
          setLoaded(null);
        }}
        onLoad={setLoaded}
      />
      {loaded && <CohortRun key={`${loaded.semester}-${loaded.programme}-${loaded.level}`} cohort={loaded} />}
    </RoleGate>
  );
}

function CohortPicker({ value, onChange, onLoad }) {
  const { data: semesters } = useApi("/semesters/", { page_size: 100, ordering: "-start_date" });
  const { data: programmes } = useApi("/programmes/", { page_size: 200, ordering: "code" });
  const { data: levels } = useApi("/levels/", { page_size: 100 });
  const semesterList = list(semesters);
  const semester = value.semester || String(semesterList.find((s) => s.is_current)?.id ?? "");
  const set = (key) => (e) => onChange({ ...value, semester, [key]: e.target.value });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose the class</CardTitle>
        <CardDescription>Students whose status allows registration are listed next.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-4 sm:items-end">
        <Field id="bulk-semester" label="Semester" required>
          <NativeSelect id="bulk-semester" value={semester} onChange={set("semester")}>
            <option value="">Choose…</option>
            {semesterList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.academic_year_name} {s.name}
                {s.is_current ? " (current)" : ""}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="bulk-programme" label="Programme" required>
          <NativeSelect id="bulk-programme" value={value.programme} onChange={set("programme")}>
            <option value="">Choose…</option>
            {list(programmes).map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="bulk-level" label="Level" required>
          <NativeSelect id="bulk-level" value={value.level} onChange={set("level")}>
            <option value="">Choose…</option>
            {list(levels).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Button
          onClick={() => {
            const next = { ...value, semester };
            onChange(next);
            onLoad(next);
          }}
          disabled={!semester || !value.programme || !value.level}
        >
          <Users /> Load students
        </Button>
      </CardContent>
    </Card>
  );
}

function CohortRun({ cohort }) {
  const { data, error, loading, reload } = useApi("/registrations/bulk/cohort/", cohort);
  const [excluded, setExcluded] = useState(() => new Set());
  const [electives, setElectives] = useState(() => new Set());
  const [rows, setRows] = useState(null);
  const [progress, setProgress] = useState(null);
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);
  const [runError, setRunError] = useState("");

  const students = useMemo(() => data?.students ?? [], [data]);
  const chosen = students.filter((s) => !excluded.has(s.id));
  const counts = useMemo(() => {
    const c = {};
    for (const row of rows ?? []) c[row.outcome] = (c[row.outcome] || 0) + 1;
    return c;
  }, [rows]);

  if (loading && !data) return <LoadingBlock rows={6} className="mt-6" />;
  if (error) return <ErrorState error={error} onRetry={reload} className="mt-6" />;
  if (!data) return null;

  const compulsory = data.offerings.filter((o) => o.is_compulsory);
  const optional = data.offerings.filter((o) => !o.is_compulsory);
  const busy = progress !== null;

  async function process(ids, endpoint, extra = {}) {
    const batches = chunks(ids, data.batch_size);
    const collected = [];
    setProgress(0);
    setRunError("");
    try {
      for (const [index, batch] of batches.entries()) {
        const { data: result } = await api.post(endpoint, {
          semester: Number(cohort.semester), students: batch, extra_offerings: [...electives], ...extra,
        });
        collected.push(...result.results);
        setProgress(Math.round(((index + 1) / batches.length) * 100));
      }
    } catch (e) {
      setRunError(`${errorMessage(e)} ${collected.length} of ${ids.length} students were processed before this.`);
    } finally {
      setProgress(null);
    }
    return collected;
  }

  async function preview() {
    setRows(await process(chosen.map((s) => s.id), "/registrations/bulk/preview/"));
  }

  async function confirm() {
    const ready = rows.filter((r) => r.outcome === "ready").map((r) => r.student);
    const done = await process(ready, "/registrations/bulk/confirm/", { reason: reason.trim(), notify });
    const byStudent = new Map(done.map((r) => [r.student, r]));
    setRows((current) => current.map((r) => byStudent.get(r.student) ?? r));
    const registered = done.filter((r) => r.outcome === "registered").length;
    if (registered) toast.success(`${registered} student${registered === 1 ? "" : "s"} registered.`);
  }

  const toggle = (setter, id) =>
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const changeSetup = (fn) => (...args) => {
    fn(...args);
    setRows(null); // the preview no longer matches
  };

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Courses · {data.semester.name}</CardTitle>
            <CardDescription>
              Compulsory courses are worked out for each student (including failed compulsory courses they must retake), so
              there is nothing to tick for them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="mb-1 font-medium">Compulsory for this level</p>
              {compulsory.length ? (
                <p className="text-muted-foreground">{compulsory.map((o) => o.course_code).join(", ")}</p>
              ) : (
                <p className="text-muted-foreground">None in the curriculum for this semester.</p>
              )}
            </div>
            <div>
              <p className="mb-2 font-medium">Electives for everyone (optional)</p>
              {optional.length === 0 && <p className="text-muted-foreground">No other open courses.</p>}
              <ul className="grid gap-2 sm:grid-cols-2">
                {optional.map((o) => (
                  <li key={o.offering} className="flex items-start gap-2">
                    <Checkbox
                      id={`elective-${o.offering}`}
                      checked={electives.has(o.offering)}
                      onCheckedChange={changeSetup(() => toggle(setElectives, o.offering))}
                      disabled={busy}
                    />
                    <Label htmlFor={`elective-${o.offering}`} className="font-normal leading-snug">
                      <span className="font-medium">{o.course_code}</span> {o.course_title}
                      <span className="text-muted-foreground"> · {o.credits} cr</span>
                    </Label>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">An elective a student is not eligible for is skipped for them, with the reason.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              Students · {chosen.length} of {students.length} selected
            </CardTitle>
            <CardDescription>Untick anyone to leave out of this run.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {students.length === 0 ? (
              <EmptyState title="No students can register" description="No student in this programme and level has a status that allows registration." />
            ) : (
              <ul className="max-h-80 divide-y overflow-y-auto border-y text-sm">
                {students.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-6 py-2">
                    <Checkbox
                      id={`student-${s.id}`}
                      aria-label={`Include ${s.full_name}`}
                      checked={!excluded.has(s.id)}
                      onCheckedChange={changeSetup(() => toggle(setExcluded, s.id))}
                      disabled={busy}
                    />
                    <label htmlFor={`student-${s.id}`} className="flex-1">
                      <span className="font-medium">{s.student_number}</span> {s.full_name}
                    </label>
                    {s.registration_status && <StatusBadge status={s.registration_status} />}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={preview} disabled={busy || chosen.length === 0} variant={rows ? "outline" : "default"}>
          {busy && !rows ? <Loader2 className="animate-spin" /> : <Eye />} Preview {chosen.length} students
        </Button>
        {busy && (
          <div className="flex min-w-48 items-center gap-2">
            <Progress value={progress} className="h-1.5" aria-label="Progress" />
            <span className="text-xs tabular-nums text-muted-foreground">{progress}%</span>
          </div>
        )}
      </div>
      {runError && (
        <Alert variant="destructive">
          <AlertDescription>{runError}</AlertDescription>
        </Alert>
      )}

      {rows && (
        <>
          <PreviewTable rows={rows} />
          {counts.ready > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Register {counts.ready} ready students</CardTitle>
                <CardDescription>
                  Students with a problem, awaiting approval or unable to register are left unchanged; deal with them one by one
                  under Register a student.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field id="bulk-reason" label="Reason" required hint="Recorded on every registration and in the audit log.">
                  <Textarea id="bulk-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Level 200 RGN, first semester 2026/27" />
                </Field>
                <div className="flex items-start gap-2">
                  <Checkbox id="bulk-notify" checked={notify} onCheckedChange={(v) => setNotify(v === true)} />
                  <Label htmlFor="bulk-notify" className="font-normal leading-snug">
                    Tell each student in the app and by push notification (no email is sent)
                  </Label>
                </div>
                <Button onClick={confirm} disabled={busy || !reason.trim()}>
                  {busy ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Register {counts.ready} students
                </Button>
              </CardContent>
            </Card>
          ) : (
            counts.registered > 0 && (
              <Alert>
                <CheckCircle2 />
                <AlertTitle>
                  {counts.registered} student{counts.registered === 1 ? "" : "s"} registered
                </AlertTitle>
                <AlertDescription>
                  See them under <Link href="/registrations" className="underline">Registrations</Link>.
                </AlertDescription>
              </Alert>
            )
          )}
        </>
      )}
    </div>
  );
}

function PreviewTable({ rows }) {
  const summary = Object.entries(OUTCOMES)
    .map(([key, o]) => [o.label, rows.filter((r) => r.outcome === key).length])
    .filter(([, n]) => n > 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview</CardTitle>
        <CardDescription>{summary.map(([label, n]) => `${n} ${label.toLowerCase()}`).join(" · ")}</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="max-h-[32rem] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Student</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Adding</TableHead>
                <TableHead className="pr-6">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.student}>
                  <TableCell className="pl-6">
                    <span className="font-medium">{r.student_number}</span>
                    <span className="block text-xs text-muted-foreground">{r.full_name}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={OUTCOMES[r.outcome]?.status} label={OUTCOMES[r.outcome]?.label} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.adding?.length ? r.adding.join(", ") : "—"}
                    {r.credits != null && <span className="block text-xs text-muted-foreground">{r.credits} credits in total</span>}
                  </TableCell>
                  <TableCell className="max-w-96 pr-6 text-xs">
                    {r.errors?.map((e) => (
                      <p key={e} className="text-destructive">
                        {e}
                      </p>
                    ))}
                    {r.skipped?.map((s) => (
                      <p key={s.course_code} className="text-muted-foreground">
                        {s.course_code} skipped: {s.reason}
                      </p>
                    ))}
                    {r.already_registered && !r.errors?.length && <p className="text-muted-foreground">Already registered; courses are added.</p>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
