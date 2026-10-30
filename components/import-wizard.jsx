"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, FileUp, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { ExportMenu } from "@/components/export-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errorMessage, fieldErrors } from "@/lib/api";

/**
 * Upload → review → confirm import for CSV or Excel files.
 *
 * columns: [{ header, cell: (input) => node }] shown in the review table.
 * The server validates everything again on confirm and creates all rows or none.
 */
export function ImportWizard({
  previewUrl, confirmUrl, templateUrl, templateName, instructions, columns, confirmLabel = "Import",
  confirmExtra, extraBody, onImported, successMessage, renderDone,
}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(null);

  async function runPreview() {
    setPending(true);
    setDone(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await api.post(previewUrl, body);
      setPreview(response.data);
    } catch (error) {
      toast.error(fieldErrors(error).file || errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  async function confirm() {
    setPending(true);
    try {
      const rows = preview.rows.filter((r) => r.valid).map((r) => r.input);
      const response = await api.post(confirmUrl, { rows, ...(extraBody || {}) });
      setDone(response.data);
      setPreview(null);
      setFile(null);
      toast.success(successMessage ? successMessage(response.data) : `${response.data.created} record(s) imported.`);
      onImported?.(response.data);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {done && (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Import complete</AlertTitle>
          <AlertDescription>{successMessage ? successMessage(done) : `${done.created} record(s) were created.`}</AlertDescription>
        </Alert>
      )}
      {done && renderDone?.(done)}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>1. Choose a file</CardTitle>
            <CardDescription>{instructions}</CardDescription>
          </div>
          <ExportMenu url={templateUrl} filename={templateName} label="Template" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sm:max-w-sm"
            aria-label="CSV or Excel file"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
            }}
          />
          <Button onClick={runPreview} disabled={!file || pending}>
            {pending && !preview ? <Loader2 className="animate-spin" /> : <FileUp />}
            Check file
          </Button>
        </CardContent>
      </Card>
      {preview && (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>2. Review</CardTitle>
              <CardDescription>
                {preview.total} row(s): {preview.valid} ready, {preview.invalid} with errors. Rows with errors are not imported. Nothing is
                saved until you confirm.
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              {confirmExtra}
              <Button onClick={confirm} disabled={pending || preview.valid === 0}>
                {pending && <Loader2 className="animate-spin" />}
                {confirmLabel} {preview.valid} row(s)
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <div className="max-h-[60svh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="pl-6">Row</TableHead>
                    {columns.map((c) => (
                      <TableHead key={c.header}>{c.header}</TableHead>
                    ))}
                    <TableHead className="pr-6">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row) => (
                    <TableRow key={row.row} className={row.valid ? "" : "bg-destructive/5"}>
                      <TableCell className="pl-6 tabular-nums">{row.row}</TableCell>
                      {columns.map((c) => (
                        <TableCell key={c.header}>{c.cell(row.input)}</TableCell>
                      ))}
                      <TableCell className="pr-6 text-sm">
                        <RowResult row={row} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RowResult({ row }) {
  return (
    <>
      {row.valid ? (
        <span className="inline-flex items-center gap-1 text-emerald-600">
          <CheckCircle2 className="size-4" /> Ready
        </span>
      ) : (
        <ul className="space-y-0.5 text-destructive">
          {Object.entries(row.errors).map(([field, messages]) => (
            <li key={field} className="flex items-start gap-1">
              <XCircle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {field}: {messages.join(" ")}
              </span>
            </li>
          ))}
        </ul>
      )}
      {row.warnings.map((warning) => (
        <p key={warning} className="mt-1 flex items-start gap-1 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {warning}
        </p>
      ))}
    </>
  );
}
