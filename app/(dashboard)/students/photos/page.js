"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { unzipSync } from "fflate";
import { CheckCircle2, FileArchive, FolderOpen, ImagePlus, Info, Loader2, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, RoleGate } from "@/components/common";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

const IMAGE = /\.(jpe?g|png|webp|heic|heif)$/i;
const BATCH_FILES = 10;
const BATCH_BYTES = 15 * 1024 * 1024; // keeps each request well inside the server's upload limits

const STATUS = {
  matched: { label: "Ready", className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300" },
  uploaded: { label: "Uploaded", className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300" },
  unmatched: { label: "No match", className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300" },
  ambiguous: { label: "Ambiguous", className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300" },
  duplicate: { label: "Duplicate", className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300" },
  invalid: { label: "Not a photo", className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300" },
  skipped: { label: "Skipped", className: "border-border bg-muted text-muted-foreground" },
};

function baseName(path) {
  return path.split(/[\\/]/).pop();
}

/** Expands ZIP files in the browser and keeps image files only. */
async function collect(fileList) {
  const files = [];
  for (const file of fileList) {
    if (/\.zip$/i.test(file.name)) {
      const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
        filter: (entry) => IMAGE.test(entry.name) && !entry.name.includes("__MACOSX/") && !baseName(entry.name).startsWith("."),
      });
      for (const [name, bytes] of Object.entries(entries)) files.push(new File([bytes], baseName(name)));
    } else if (IMAGE.test(file.name) || file.type.startsWith("image/")) {
      files.push(file);
    }
  }
  return files;
}

export default function StudentPhotoImportPage() {
  const [rows, setRows] = useState(null); // [{ file, filename, status, message, student }]
  const [replace, setReplace] = useState(false);
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total }
  const [finished, setFinished] = useState(false);
  const [dragging, setDragging] = useState(false);
  const filesInput = useRef(null);
  const folderInput = useRef(null);

  async function choose(fileList) {
    if (!fileList?.length) return;
    setReading(true);
    setFinished(false);
    try {
      const files = await collect(Array.from(fileList));
      if (!files.length) {
        toast.error("No photos found. Use JPG, PNG or WebP files, or a ZIP of them.");
        return;
      }
      const { data } = await api.post("/students/photos/match/", { filenames: files.map((f) => f.name) });
      setRows(data.files.map((row, i) => ({ ...row, file: files[i] })));
    } catch (e) {
      toast.error(errorMessage(e, "The photos could not be read."));
    } finally {
      setReading(false);
    }
  }

  const counts = useMemo(() => {
    const c = { total: rows?.length ?? 0, ready: 0, existing: 0, problems: 0 };
    for (const row of rows ?? []) {
      if (row.status === "matched") {
        c.ready += 1;
        if (row.student?.has_photo) c.existing += 1;
      } else if (row.status !== "uploaded" && row.status !== "skipped") {
        c.problems += 1;
      }
    }
    return c;
  }, [rows]);
  const toSend = (rows ?? []).filter((r) => r.status === "matched" && (replace || !r.student?.has_photo));

  async function upload() {
    const queue = [...toSend];
    const batches = [];
    while (queue.length) {
      const batch = [];
      let bytes = 0;
      while (queue.length && batch.length < BATCH_FILES && (batch.length === 0 || bytes + queue[0].file.size <= BATCH_BYTES)) {
        bytes += queue[0].file.size;
        batch.push(queue.shift());
      }
      batches.push(batch);
    }
    setProgress({ done: 0, total: toSend.length });
    let uploaded = 0;
    for (const batch of batches) {
      const body = new FormData();
      for (const row of batch) body.append("files", row.file, row.filename);
      body.append("replace", String(replace));
      let results;
      try {
        ({ data: { files: results } } = await api.post("/students/photos/upload/", body, { timeout: 120000 }));
      } catch (e) {
        results = batch.map((row) => ({ filename: row.filename, status: "skipped", message: errorMessage(e) }));
      }
      uploaded += results.filter((r) => r.status === "uploaded").length;
      setRows((current) =>
        current.map((row) => {
          const index = batch.indexOf(row);
          return index === -1 ? row : { ...row, status: results[index].status, message: results[index].message };
        }),
      );
      setProgress((p) => ({ ...p, done: p.done + batch.length }));
    }
    setFinished(true);
    setProgress(null);
    toast.success(`${uploaded} photo${uploaded === 1 ? "" : "s"} uploaded.`);
  }

  function reset() {
    setRows(null);
    setFinished(false);
    setReplace(false);
  }

  const busy = reading || progress !== null;
  return (
    <RoleGate roles={["ADMIN", "REGISTRAR"]}>
      <PageHeader
        title="Import student photos"
        description="Upload many photos at once. Each file is matched to a student by its name, which must be the student number."
        actions={
          <Button variant="outline" asChild>
            <Link href="/students">Student records</Link>
          </Button>
        }
      />
      {!rows && (
        <Card>
          <CardHeader>
            <CardTitle>Choose photos</CardTitle>
            <CardDescription>
              Name each file with the student number: punctuation and capital letters are ignored, so NCHT/2026/0007 can be
              <span className="font-mono"> NCHT-2026-0007.jpg</span> or <span className="font-mono">ncht20260007.png</span>.
              Photos are cropped to passport shape, resized and stored privately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                choose(e.dataTransfer.files);
              }}
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
                dragging && "border-primary bg-primary/5",
              )}
            >
              {reading ? <Loader2 className="size-8 animate-spin text-muted-foreground" /> : <ImagePlus className="size-8 text-muted-foreground" />}
              <p className="text-sm text-muted-foreground">Drop photos or a ZIP file here, or</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => filesInput.current?.click()} disabled={reading}>
                  <Upload /> Choose photos or ZIP
                </Button>
                <Button variant="outline" onClick={() => folderInput.current?.click()} disabled={reading}>
                  <FolderOpen /> Choose a folder
                </Button>
              </div>
              <input
                ref={filesInput}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,.zip,application/zip"
                className="sr-only"
                aria-label="Photos or ZIP file"
                onChange={(e) => {
                  choose(e.target.files);
                  e.target.value = "";
                }}
              />
              <input
                ref={folderInput}
                type="file"
                multiple
                webkitdirectory=""
                className="sr-only"
                aria-label="Folder of photos"
                onChange={(e) => {
                  choose(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            <Alert>
              <Info />
              <AlertTitle>For the best results</AlertTitle>
              <AlertDescription>
                Use a plain, light background with the face in the centre: photos are cropped from the centre. JPG, PNG and
                WebP up to 10 MB each. iPhone HEIC files must be saved as JPG first. Up to about 200 photos at a time works best.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {rows && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">{counts.total} files</Badge>
            <Badge variant="outline" className={STATUS.matched.className}>{counts.ready} ready</Badge>
            {counts.existing > 0 && <Badge variant="outline">{counts.existing} already have a photo</Badge>}
            {counts.problems > 0 && <Badge variant="outline" className={STATUS.unmatched.className}>{counts.problems} need attention</Badge>}
            <div className="ml-auto flex flex-wrap items-center gap-3">
              {!finished && counts.existing > 0 && (
                <label className="flex items-center gap-2">
                  <Checkbox checked={replace} onCheckedChange={(v) => setReplace(v === true)} disabled={busy} />
                  Replace existing photos
                </label>
              )}
              <Button variant="outline" onClick={reset} disabled={busy}>
                <RotateCcw /> {finished ? "Import more" : "Start again"}
              </Button>
              {!finished && (
                <Button onClick={upload} disabled={busy || toSend.length === 0}>
                  {progress ? <Loader2 className="animate-spin" /> : <Upload />}
                  Upload {toSend.length} photo{toSend.length === 1 ? "" : "s"}
                </Button>
              )}
            </div>
          </div>
          {progress && (
            <div className="space-y-1">
              <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} aria-label="Upload progress" />
              <p className="text-xs text-muted-foreground">
                {progress.done} of {progress.total} sent. Keep this page open until it finishes.
              </p>
            </div>
          )}
          {finished && (
            <Alert>
              <CheckCircle2 />
              <AlertTitle>Import finished</AlertTitle>
              <AlertDescription>
                {rows.filter((r) => r.status === "uploaded").length} uploaded. Files marked skipped, no match, duplicate or
                ambiguous were not used; rename them and import them again.
              </AlertDescription>
            </Alert>
          )}
          {counts.problems > 0 && !finished && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileArchive className="size-4" /> Files that need attention are left out. Rename them to the exact student
              number and import them again.
            </p>
          )}
          <Card className="overflow-hidden py-0">
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="pl-4">File</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-4">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => {
                    const style = STATUS[row.status] ?? STATUS.skipped;
                    const willSkip = row.status === "matched" && row.student?.has_photo && !replace;
                    return (
                      <TableRow key={`${row.filename}-${i}`}>
                        <TableCell className="pl-4 font-mono text-xs">{row.filename}</TableCell>
                        <TableCell>
                          {row.student ? (
                            <>
                              {row.student.full_name}
                              <span className="block text-xs text-muted-foreground">{row.student.student_number}</span>
                            </>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={willSkip ? STATUS.skipped.className : style.className}>
                            {willSkip ? "Keep existing" : style.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-4 text-sm text-muted-foreground">
                          {willSkip ? "Already has a photo." : row.message}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}
    </RoleGate>
  );
}
