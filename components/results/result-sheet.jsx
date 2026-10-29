"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2, FilePen, FileUp, Loader2, Plus, RotateCcw, Save, Send, Trash2, Undo2, Upload,
} from "lucide-react";
import Link from "next/link";
import { SignoffWarnings } from "@/components/results/signoff-warnings";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmDialog, PageHeader, StatusBadge } from "@/components/common";
import { Field } from "@/components/forms/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ExportMenu } from "@/components/export-menu";
import { ImportMarksDialog } from "@/components/results/import-marks";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Full result sheet: assessment set-up, marks grid, workflow actions and history. */
export function ResultSheet({ sheet, onChange }) {
  const p = sheet.permissions;
  const [action, setAction] = useState(null);
  const [amending, setAmending] = useState(null);
  const [openingResit, setOpeningResit] = useState(false);
  const [importing, setImporting] = useState(false);

  async function transition(name, comment) {
    try {
      const response = await api.post(`/result-sheets/${sheet.id}/${name}/`, { comment });
      onChange(response.data);
      toast.success(
        { submit: "Results submitted for review.", return: "Results returned to the lecturer.", approve: "Results approved.", publish: "Results published to students." }[name],
      );
    } catch (error) {
      const data = error.response?.data;
      toast.error(errorMessage(error), {
        description: Array.isArray(data?.errors) && data.errors.length ? data.errors.map((e) => e.student_number).filter(Boolean).slice(0, 8).join(", ") : undefined,
      });
      throw error;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${sheet.course_code} · ${sheet.course_title}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {sheet.semester_name} · {sheet.credits} credits · {sheet.grading_scheme_name}
            <StatusBadge status={sheet.status} label={sheet.status_display} />
          </span>
        }
        actions={
          <>
            <ExportMenu url={`/result-sheets/${sheet.id}/export/`} filename={`results-${sheet.course_code}`} />
            {p.can_enter_marks && sheet.components.length > 0 && (
              <Button variant="outline" onClick={() => setImporting(true)}>
                <FileUp /> Import marks
              </Button>
            )}
            {p.can_submit && (
              <Button onClick={() => setAction("submit")}>
                <Send /> Submit for review
              </Button>
            )}
            {p.can_return && (
              <Button variant="outline" onClick={() => setAction("return")}>
                <Undo2 /> Return for correction
              </Button>
            )}
            {p.can_approve && (
              <Button onClick={() => setAction("approve")}>
                <CheckCircle2 /> Approve
              </Button>
            )}
            {p.can_publish && (
              <Button onClick={() => setAction("publish")}>
                <Upload /> Publish
              </Button>
            )}
            {sheet.resit_sheet_id && (
              <Button variant="outline" asChild>
                <Link href={`/results/resits/${sheet.resit_sheet_id}`}>
                  <RotateCcw /> Resit
                </Link>
              </Button>
            )}
            {p.can_open_resit && (
              <Button variant="outline" onClick={() => setOpeningResit(true)}>
                <RotateCcw /> Open resit
              </Button>
            )}
          </>
        }
      />

      <SignoffWarnings warnings={sheet.signoff_warnings} />
      {sheet.status === "RETURNED" && sheet.last_comment && (
        <Alert>
          <Undo2 />
          <AlertTitle>Returned for correction</AlertTitle>
          <AlertDescription>{sheet.last_comment}</AlertDescription>
        </Alert>
      )}
      {sheet.status === "PUBLISHED" && (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Published</AlertTitle>
          <AlertDescription>
            Students can see these results. Changes are only possible through an approved amendment.
          </AlertDescription>
        </Alert>
      )}
      {!sheet.entry_open && ["DRAFT", "RETURNED"].includes(sheet.status) && (
        <Alert variant="destructive">
          <AlertTitle>The result-entry deadline has passed</AlertTitle>
          <AlertDescription>Contact the examinations office if marks still need to be entered.</AlertDescription>
        </Alert>
      )}

      <SummaryCards summary={sheet.summary} />

      {(p.can_configure || sheet.components.length === 0) && (
        <ComponentsEditor sheet={sheet} onChange={onChange} editable={p.can_configure} />
      )}

      {sheet.components.length > 0 && (
        <MarksGrid sheet={sheet} onChange={onChange} editable={p.can_enter_marks} onAmend={p.can_request_amendment ? setAmending : null} />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <GradeDistribution sheet={sheet} />
        <Card>
          <CardHeader>
            <CardTitle>Workflow history</CardTitle>
          </CardHeader>
          <CardContent>
            {sheet.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not yet submitted.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {sheet.events.map((e) => (
                  <li key={e.id} className="border-l-2 pl-3">
                    <p className="font-medium">
                      <StatusBadge status={e.from_status} /> → <StatusBadge status={e.to_status} />
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {e.actor_name || "System"} · {formatDateTime(e.created_at)}
                    </p>
                    {e.comment && <p className="mt-0.5">{e.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={action !== null}
        onOpenChange={(open) => !open && setAction(null)}
        title={{
          submit: "Submit these results for review?",
          return: "Return these results to the lecturer?",
          approve: "Approve these results?",
          publish: "Publish these results?",
        }[action]}
        description={{
          submit: "You will not be able to edit marks unless the results are returned for correction.",
          return: "The lecturer will be able to edit marks again. Explain what needs to be corrected.",
          approve: "Approved results can then be published by an authorised officer.",
          publish: "Students will immediately see their grades. Published results can only be changed through a formal amendment.",
        }[action]}
        confirmLabel={{ submit: "Submit", return: "Return", approve: "Approve", publish: "Publish" }[action]}
        requireReason
        reasonLabel="Comment"
        reasonOptional={action !== "return"}
        onConfirm={(comment) => transition(action, comment)}
      />
      {amending && <AmendmentDialog sheet={sheet} row={amending} onClose={() => setAmending(null)} />}
      {openingResit && <OpenResitDialog sheet={sheet} onClose={() => setOpeningResit(false)} />}
      {importing && <ImportMarksDialog sheet={sheet} onClose={() => setImporting(false)} onApplied={onChange} />}
    </div>
  );
}

function SummaryCards({ summary }) {
  const items = [
    ["Students", summary.students],
    ["Complete", summary.complete],
    ["Missing marks", summary.missing],
    ["Passed", summary.passed],
    ["Failed", summary.failed],
    ["Average", summary.average ?? "—"],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={cn("text-lg font-semibold tabular-nums", label === "Missing marks" && value > 0 && "text-amber-600")}>{value}</p>
        </div>
      ))}
    </div>
  );
}

function componentRows(components) {
  return components.length
    ? components.map((c) => ({ ...c, weight: String(Number(c.weight)), max_score: String(Number(c.max_score)) }))
    : [
        { name: "Continuous assessment", weight: "40", max_score: "40", is_required: true, is_examination: false },
        { name: "Final examination", weight: "60", max_score: "100", is_required: true, is_examination: true },
      ];
}

function ComponentsEditor({ sheet, onChange, editable }) {
  const [rows, setRows] = useState(() => componentRows(sheet.components));
  const [source, setSource] = useState(sheet.components);
  const [pending, setPending] = useState(false);
  if (source !== sheet.components) {
    setSource(sheet.components);
    setRows(componentRows(sheet.components));
  }

  const total = rows.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
  const update = (index, patch) => setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  async function save() {
    setPending(true);
    try {
      const response = await api.put(`/result-sheets/${sheet.id}/components/`, {
        components: rows.map((r) => ({
          id: r.id, name: r.name, weight: r.weight, max_score: r.max_score, is_required: r.is_required,
          is_examination: Boolean(r.is_examination),
        })),
      });
      onChange(response.data);
      toast.success("Assessment components saved.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  if (!editable) {
    return (
      <Alert>
        <AlertTitle>No assessment components yet</AlertTitle>
        <AlertDescription>The assigned lecturer has not configured how this course is assessed.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assessment components</CardTitle>
        <CardDescription>
          Weights must total 100%. Each score is scaled: (score ÷ maximum) × weight. Mark the examination component(s): a resit
          replaces their score and keeps coursework. Removing a component deletes its draft marks.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="hidden grid-cols-[1fr_7rem_7rem_6rem_6rem_2.5rem] gap-2 text-xs font-medium text-muted-foreground sm:grid">
          <span>Name</span>
          <span>Weight (%)</span>
          <span>Maximum score</span>
          <span>Required</span>
          <span title="Replaced by the resit score in a resit">Examination</span>
          <span />
        </div>
        {rows.map((row, index) => (
          <div key={row.id ?? `new-${index}`} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_7rem_7rem_6rem_6rem_2.5rem] sm:items-center">
            <Input className="col-span-2 sm:col-span-1" aria-label="Component name" value={row.name} onChange={(e) => update(index, { name: e.target.value })} />
            <Input type="number" min="0" max="100" step="0.5" aria-label="Weight" value={row.weight} onChange={(e) => update(index, { weight: e.target.value })} />
            <Input type="number" min="1" step="0.5" aria-label="Maximum score" value={row.max_score} onChange={(e) => update(index, { max_score: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={row.is_required} onCheckedChange={(v) => update(index, { is_required: Boolean(v) })} /> Required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={Boolean(row.is_examination)} onCheckedChange={(v) => update(index, { is_examination: Boolean(v) })} /> Exam
            </label>
            <Button variant="ghost" size="icon-sm" aria-label="Remove component" onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRows((prev) => [...prev, { name: "", weight: "0", max_score: "100", is_required: true }])}>
            <Plus /> Add component
          </Button>
          <span className={cn("text-sm tabular-nums", total === 100 ? "text-emerald-600" : "text-destructive")}>Total weight: {total}%</span>
          <Button size="sm" className="ml-auto" onClick={save} disabled={pending || total !== 100 || rows.some((r) => !r.name.trim())}>
            {pending && <Loader2 className="animate-spin" />}
            Save components
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MarksGrid({ sheet, onChange, editable, onAmend }) {
  const components = sheet.components;
  const [draft, setDraft] = useState({});
  const [rowsSource, setRowsSource] = useState(sheet.rows);
  const [saving, setSaving] = useState(false);
  const inputs = useRef({});
  const dirtyCount = Object.keys(draft).length;
  if (rowsSource !== sheet.rows) {
    // Fresh rows from the server replace any local edits that were just saved.
    setRowsSource(sheet.rows);
    setDraft({});
  }

  useEffect(() => {
    if (!dirtyCount) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirtyCount]);

  const maxById = useMemo(() => Object.fromEntries(components.map((c) => [c.id, Number(c.max_score)])), [components]);

  function valueFor(row, component) {
    const key = `${row.registration}:${component.id}`;
    if (key in draft) return draft[key];
    return row.marks[String(component.id)] ?? "";
  }

  function invalid(value, componentId) {
    if (value === "" || value === null) return false;
    const n = Number(value);
    return Number.isNaN(n) || n < 0 || n > maxById[componentId];
  }

  const hasInvalid = Object.entries(draft).some(([key, value]) => invalid(value, Number(key.split(":")[1])));

  async function save() {
    setSaving(true);
    try {
      const marks = Object.entries(draft).map(([key, value]) => {
        const [registration, component] = key.split(":").map(Number);
        return { registration, component, score: value === "" ? null : value };
      });
      const response = await api.put(`/result-sheets/${sheet.id}/marks/`, { marks });
      onChange(response.data);
      toast.success(`${response.data.changed} mark(s) saved.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(event, rowIndex, colIndex) {
    const move = { Enter: [1, 0], ArrowDown: [1, 0], ArrowUp: [-1, 0] }[event.key];
    if (!move) return;
    event.preventDefault();
    const target = inputs.current[`${rowIndex + move[0]}:${colIndex + move[1]}`];
    target?.focus();
    target?.select();
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Marks</CardTitle>
          <CardDescription>
            {editable
              ? "Enter raw scores. Press Enter or the arrow keys to move between students. Save regularly; nothing is submitted until you choose Submit."
              : "Read-only. Marks can only be edited by the assigned lecturer while results are in draft or returned."}
          </CardDescription>
        </div>
        {editable && (
          <Button onClick={save} disabled={!dirtyCount || saving || hasInvalid}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Save draft{dirtyCount ? ` (${dirtyCount})` : ""}
          </Button>
        )}
      </CardHeader>
      <CardContent className="px-0">
        {sheet.rows.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-muted-foreground">No students are registered for this course.</p>
        ) : (
          <div className="max-h-[70svh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="pl-6">Student</TableHead>
                  {components.map((c) => (
                    <TableHead key={c.id} className="min-w-28 text-center">
                      {c.name}
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        /{Number(c.max_score)} · {Number(c.weight)}%{c.is_required ? "" : " · optional"}
                      </span>
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="pr-6 text-center">Grade</TableHead>
                  {onAmend && <TableHead className="pr-6" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheet.rows.map((row, rowIndex) => (
                  <TableRow key={row.registration}>
                    <TableCell className="pl-6">
                      <p className="font-medium">{row.student_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.student_number}
                        {row.is_retake && " · retake"}
                        {row.is_amended && " · amended"}
                      </p>
                    </TableCell>
                    {components.map((c, colIndex) => {
                      const value = valueFor(row, c);
                      const bad = invalid(value, c.id);
                      const missing = row.missing_components.includes(c.id) && value === "";
                      return (
                        <TableCell key={c.id} className="text-center">
                          {editable ? (
                            <Input
                              ref={(el) => (inputs.current[`${rowIndex}:${colIndex}`] = el)}
                              type="number"
                              inputMode="decimal"
                              min="0"
                              max={Number(c.max_score)}
                              step="0.01"
                              value={value}
                              aria-label={`${c.name} for ${row.student_name}`}
                              aria-invalid={bad || undefined}
                              className={cn("mx-auto h-8 w-24 text-center tabular-nums", missing && "border-amber-400")}
                              onKeyDown={(e) => onKeyDown(e, rowIndex, colIndex)}
                              onChange={(e) => setDraft((prev) => ({ ...prev, [`${row.registration}:${c.id}`]: e.target.value }))}
                            />
                          ) : (
                            <span className={cn("tabular-nums", value === "" && "text-muted-foreground")}>{value === "" ? "—" : value}</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right tabular-nums">{row.total ?? "—"}</TableCell>
                    <TableCell className={cn("pr-6 text-center font-semibold", row.is_pass === false && "text-destructive")}>
                      {row.grade ?? "—"}
                    </TableCell>
                    {onAmend && (
                      <TableCell className="pr-6 text-right">
                        {row.result_id && (
                          <Button size="sm" variant="ghost" onClick={() => onAmend(row)}>
                            <FilePen /> Amend
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {dirtyCount > 0 && <p className="px-6 pt-3 text-xs text-amber-700 dark:text-amber-400">You have unsaved changes.</p>}
      </CardContent>
    </Card>
  );
}

function GradeDistribution({ sheet }) {
  const distribution = sheet.summary.distribution || {};
  const bands = sheet.grade_bands;
  const max = Math.max(1, ...Object.values(distribution));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Grade distribution</CardTitle>
        <CardDescription>Based on the current marks.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {bands.map((band) => {
            const count = distribution[band.letter] || 0;
            return (
              <li key={band.letter} className="grid grid-cols-[2.5rem_1fr_2rem] items-center gap-2 text-sm" title={`${band.letter}: ${band.min_score}–${band.max_score}`}>
                <span className="font-medium">{band.letter}</span>
                <span className="h-3 rounded-sm bg-muted">
                  <span className="block h-3 rounded-sm bg-primary" style={{ width: `${(count / max) * 100}%` }} />
                </span>
                <span className="text-right tabular-nums text-muted-foreground">{count}</span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function AmendmentDialog({ sheet, row, onClose }) {
  const [marks, setMarks] = useState(() => Object.fromEntries(sheet.components.map((c) => [c.id, row.marks[String(c.id)] ?? ""])));
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    try {
      await api.post("/result-amendments/", {
        course_result: row.result_id,
        new_marks: Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, v === "" ? null : String(v)])),
        reason,
      });
      toast.success("Amendment requested. It takes effect once approved.");
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request amendment</DialogTitle>
          <DialogDescription>
            {row.student_name} ({row.student_number}) — current total {row.total}, grade {row.grade}. The change needs approval by an authorised officer.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {sheet.components.map((c) => (
            <Field key={c.id} id={`amend-${c.id}`} label={`${c.name} (/${Number(c.max_score)})`}>
              <Input id={`amend-${c.id}`} type="number" min="0" max={Number(c.max_score)} step="0.01" value={marks[c.id]} onChange={(e) => setMarks((prev) => ({ ...prev, [c.id]: e.target.value }))} />
            </Field>
          ))}
          <Field id="amend-reason" label="Reason for amendment" required className="sm:col-span-2">
            <Textarea id="amend-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !reason.trim()}>
            {pending && <Loader2 className="animate-spin" />}
            Request amendment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function OpenResitDialog({ sheet, onClose }) {
  const router = useRouter();
  const [deadline, setDeadline] = useState("");
  const [pending, setPending] = useState(false);
  async function open() {
    setPending(true);
    try {
      const response = await api.post("/resit-sheets/open/", {
        offering: sheet.offering,
        registration_deadline: deadline ? new Date(deadline).toISOString() : null,
      });
      toast.success(`Resit opened. ${response.data.rows.length} student(s) are eligible.`);
      router.push(`/results/resits/${response.data.id}`);
    } catch (error) {
      toast.error(errorMessage(error));
      setPending(false);
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open a resit for {sheet.course_code}</DialogTitle>
          <DialogDescription>
            Failed students who meet the academic regulations become eligible. They register for the resit before the deadline,
            then the lecturer enters resit scores, which go through approval and publication like ordinary results.
          </DialogDescription>
        </DialogHeader>
        <Field id="resit-deadline" label="Registration deadline" hint="Optional. Registry staff can still register students afterwards.">
          <Input id="resit-deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={open} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Open resit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
