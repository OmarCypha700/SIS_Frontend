"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { ExportMenu } from "@/components/export-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errorMessage } from "@/lib/api";

/**
 * Upload marks from a CSV/Excel file. The server checks the file and returns the changes;
 * they are only saved when the lecturer confirms, through the normal marks endpoint.
 */
export function ImportMarksDialog({ sheet, onClose, onApplied }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [pending, setPending] = useState(false);

  async function check() {
    setPending(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await api.post(`/result-sheets/${sheet.id}/marks-import/`, body);
      setPreview(response.data);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  async function apply() {
    setPending(true);
    try {
      const response = await api.put(`/result-sheets/${sheet.id}/marks/`, { marks: preview.entries, source: "import" });
      onApplied(response.data);
      toast.success(`${response.data.changed} mark(s) imported. Review them, then submit when ready.`);
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import marks · {sheet.course_code}</DialogTitle>
          <DialogDescription>
            Download the template (it lists your class and has one column per assessment), fill in raw scores, and upload it as CSV or
            Excel. Blank cells leave existing marks unchanged. Nothing is saved until you apply the changes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ExportMenu url={`/result-sheets/${sheet.id}/marks-template/`} filename={`marks-${sheet.course_code}`} label="Template" />
          <Input
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-label="Marks file"
            className="sm:max-w-xs"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
            }}
          />
          <Button onClick={check} disabled={!file || pending}>
            {pending && !preview ? <Loader2 className="animate-spin" /> : <FileUp />}
            Check file
          </Button>
        </div>

        {preview && (
          <div className="space-y-3">
            <p className="text-sm">
              <strong>{preview.entries.length}</strong> mark change(s) from {preview.valid_rows} valid row(s).
              {preview.invalid_rows > 0 && <span className="text-destructive"> {preview.invalid_rows} row(s) have errors and will be skipped.</span>}
            </p>
            {(preview.ignored_columns.length > 0 || preview.unmapped_components.length > 0 || preview.students_not_in_file.length > 0) && (
              <Alert>
                <AlertTriangle />
                <AlertDescription className="space-y-1">
                  {preview.ignored_columns.length > 0 && <p>Ignored columns: {preview.ignored_columns.join(", ")}.</p>}
                  {preview.unmapped_components.length > 0 && <p>Not in the file (unchanged): {preview.unmapped_components.join(", ")}.</p>}
                  {preview.students_not_in_file.length > 0 && (
                    <p>
                      {preview.students_not_in_file.length} registered student(s) are not in the file:{" "}
                      {preview.students_not_in_file.slice(0, 8).map((s) => s.student_number).join(", ")}
                      {preview.students_not_in_file.length > 8 && "…"}
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <div className="max-h-[45svh] overflow-auto rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="pl-4">Row</TableHead>
                    <TableHead>Student</TableHead>
                    {preview.components.map((c) => (
                      <TableHead key={c.id} className="text-center">
                        {c.name}
                      </TableHead>
                    ))}
                    <TableHead className="pr-4">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row) => (
                    <TableRow key={row.row} className={row.errors.length ? "bg-destructive/5" : ""}>
                      <TableCell className="pl-4 tabular-nums">{row.row}</TableCell>
                      <TableCell>
                        <p className="font-medium">{row.student_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{row.student_number || "—"}</p>
                      </TableCell>
                      {preview.components.map((c) => (
                        <TableCell key={c.id} className="text-center tabular-nums">
                          {row.values[String(c.id)] || "—"}
                        </TableCell>
                      ))}
                      <TableCell className="pr-4 text-sm">
                        {row.errors.length ? (
                          <ul className="space-y-0.5 text-destructive">
                            {row.errors.map((e) => (
                              <li key={e} className="flex items-start gap-1">
                                <XCircle className="mt-0.5 size-3.5 shrink-0" /> {e}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="size-4" /> {row.changes ? `${row.changes} change(s)` : "No change"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={!preview || preview.entries.length === 0 || pending}>
            {pending && preview && <Loader2 className="animate-spin" />}
            Apply {preview?.entries.length ?? 0} change(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
