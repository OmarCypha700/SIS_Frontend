"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Info, Loader2, Save, Send, Undo2, Upload, UserPlus } from "lucide-react";
import { SignoffWarnings } from "@/components/results/signoff-warnings";
import { toast } from "sonner";

import { ConfirmDialog, ErrorState, LoadingBlock, PageHeader, RoleGate, StatusBadge } from "@/components/common";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const MESSAGES = {
  submit: "Resit scores submitted for review.",
  return: "Resit returned to the lecturer.",
  approve: "Resit scores approved.",
  publish: "Resit results published. Course results have been updated.",
};

export default function ResitSheetPage() {
  const { id } = useParams();
  const { data: sheet, error, loading, reload, setData } = useApi(`/resit-sheets/${id}/`);
  const [scores, setScores] = useState({});
  const [source, setSource] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [action, setAction] = useState(null);
  const [saving, setSaving] = useState(false);

  if (sheet !== source) {
    // Fresh data from the server replaces local edits that were just saved.
    setSource(sheet);
    setScores({});
    setSelected(new Set());
  }

  if (loading && !sheet) return <LoadingBlock rows={8} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const p = sheet.permissions;
  const dirty = Object.keys(scores).length;
  const invalid = Object.values(scores).some((v) => v !== "" && (Number.isNaN(Number(v)) || Number(v) < 0 || Number(v) > 100));

  async function saveScores() {
    setSaving(true);
    try {
      const response = await api.put(`/resit-sheets/${id}/scores/`, {
        scores: Object.entries(scores).map(([entry, score]) => ({ entry: Number(entry), score: score === "" ? null : score })),
      });
      setData(response.data);
      toast.success(`${response.data.changed} score(s) saved.`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function run(name, comment) {
    try {
      if (name === "register") {
        const response = await api.post(`/resit-sheets/${id}/register/`, { entries: [...selected], reason: comment });
        setData(response.data);
        toast.success("Students registered for the resit.");
        return;
      }
      const response = await api.post(`/resit-sheets/${id}/${name}/`, { comment });
      setData(response.data);
      toast.success(MESSAGES[name]);
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  }

  const eligibleSelectable = sheet.rows.filter((r) => r.status === "ELIGIBLE");

  return (
    <RoleGate roles={["ADMIN", "REGISTRAR", "RESULTS_OFFICER", "LECTURER"]}>
      <PageHeader
        title={`Resit · ${sheet.course_code} ${sheet.course_title}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {sheet.semester_name} · registration deadline {formatDateTime(sheet.registration_deadline)}
            <StatusBadge status={sheet.status} label={sheet.status_display} />
          </span>
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/results/courses/${sheet.offering}`}>Original results</Link>
            </Button>
            {p.can_submit && (
              <Button onClick={() => setAction("submit")} disabled={dirty > 0}>
                <Send /> Submit for review
              </Button>
            )}
            {p.can_return && (
              <Button variant="outline" onClick={() => setAction("return")}>
                <Undo2 /> Return
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
          </>
        }
      />
      <Alert className="mb-4">
        <Info />
        <AlertTitle>How the new result is calculated</AlertTitle>
        <AlertDescription>
          {sheet.exam_components.length
            ? `Coursework is kept and the resit score (out of 100) replaces: ${sheet.exam_components.join(", ")}.`
            : "No component is marked as an examination, so the resit score (out of 100) becomes the course total."}{" "}
          {sheet.grade_cap ? `Resit grades are capped at ${sheet.grade_cap} grade points.` : "There is no resit grade cap."}{" "}
          Students who do not register keep their original result.
        </AlertDescription>
      </Alert>
      <SignoffWarnings warnings={sheet.signoff_warnings} />
      {sheet.status === "RETURNED" && sheet.last_comment && (
        <Alert className="mb-4">
          <Undo2 />
          <AlertTitle>Returned for correction</AlertTitle>
          <AlertDescription>{sheet.last_comment}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Candidates</CardTitle>
            <CardDescription>
              {sheet.registered_count} registered of {sheet.eligible_count} eligible.
              {p.can_enter_scores && " Enter resit scores out of 100 for registered students, then save."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {p.can_register && eligibleSelectable.length > 0 && (
              <Button variant="outline" disabled={selected.size === 0} onClick={() => setAction("register")}>
                <UserPlus /> Register selected ({selected.size})
              </Button>
            )}
            {p.can_enter_scores && (
              <Button onClick={saveScores} disabled={!dirty || saving || invalid}>
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                Save scores{dirty ? ` (${dirty})` : ""}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {sheet.rows.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No students were eligible for this resit.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {p.can_register && <TableHead className="w-10 pl-6" />}
                    <TableHead className={p.can_register ? "" : "pl-6"}>Student</TableHead>
                    <TableHead>Original</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Resit score</TableHead>
                    <TableHead className="pr-6">New result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sheet.rows.map((row) => {
                    const value = row.id in scores ? scores[row.id] : row.score ?? "";
                    const bad = value !== "" && (Number.isNaN(Number(value)) || Number(value) < 0 || Number(value) > 100);
                    return (
                      <TableRow key={row.id}>
                        {p.can_register && (
                          <TableCell className="pl-6">
                            {row.status === "ELIGIBLE" && (
                              <Checkbox
                                aria-label={`Select ${row.student_name}`}
                                checked={selected.has(row.id)}
                                onCheckedChange={(v) =>
                                  setSelected((prev) => {
                                    const next = new Set(prev);
                                    if (v) next.add(row.id);
                                    else next.delete(row.id);
                                    return next;
                                  })
                                }
                              />
                            )}
                          </TableCell>
                        )}
                        <TableCell className={p.can_register ? "" : "pl-6"}>
                          <p className="font-medium">{row.student_name}</p>
                          <p className="text-xs text-muted-foreground">{row.student_number}</p>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {row.original_total} · <span className="font-semibold text-destructive">{row.original_grade}</span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={row.status} label={row.status_display} />
                        </TableCell>
                        <TableCell className="text-center">
                          {p.can_enter_scores && row.status === "REGISTERED" ? (
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={value}
                              aria-label={`Resit score for ${row.student_name}`}
                              aria-invalid={bad || undefined}
                              className="mx-auto h-8 w-24 text-center tabular-nums"
                              onChange={(e) => setScores((prev) => ({ ...prev, [row.id]: e.target.value }))}
                            />
                          ) : (
                            <span className="tabular-nums">{row.score ?? "—"}</span>
                          )}
                        </TableCell>
                        <TableCell className="pr-6 tabular-nums">
                          {row.new_grade
                            ? `${row.new_total} · ${row.new_grade}`
                            : row.projected_grade
                              ? <span className="text-muted-foreground">{row.projected_total} · {row.projected_grade} (projected)</span>
                              : "—"}
                          {row.projected_capped && <span className={cn("ml-1 text-xs text-amber-600")}>capped</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={action !== null}
        onOpenChange={(open) => !open && setAction(null)}
        title={{
          submit: "Submit resit scores for review?",
          return: "Return the resit to the lecturer?",
          approve: "Approve these resit scores?",
          publish: "Publish the resit results?",
          register: `Register ${selected.size} student(s) for the resit?`,
        }[action]}
        description={{
          publish: "Students' course results will be replaced by their resit results. This cannot be undone through ordinary editing.",
          register: "Use this when a student cannot register themselves, for example after the deadline.",
        }[action]}
        confirmLabel={{ submit: "Submit", return: "Return", approve: "Approve", publish: "Publish", register: "Register" }[action]}
        requireReason
        reasonLabel={action === "register" ? "Reason" : "Comment"}
        reasonOptional={!["return", "register"].includes(action)}
        onConfirm={(comment) => run(action, comment)}
      />
    </RoleGate>
  );
}
