"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, FileBadge, Loader2, PenLine, Stamp } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api, downloadFile, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Download the official PDF of an issued transcript (each download is counted as a copy). */
export async function downloadTranscript(transcript) {
  await downloadFile(`/transcripts/${transcript.id}/pdf/`, undefined, `transcript-${transcript.serial.replaceAll("/", "-")}.pdf`);
}

/**
 * Issue an official transcript for one student: shows what will be printed (and what will not),
 * asks who it is for and how it will be signed, then downloads the PDF.
 */
export function IssueTranscriptDialog({ studentId, onClose, onIssued }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [purpose, setPurpose] = useState("");
  const [signing, setSigning] = useState("HAND");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api
      .get("/transcripts/preview/", { params: { student: studentId } })
      .then(({ data }) => setPreview(data))
      .catch((e) => setError(errorMessage(e)));
  }, [studentId]);

  async function submit() {
    setPending(true);
    setError("");
    try {
      const { data } = await api.post("/transcripts/", { student: studentId, purpose: purpose.trim(), signing });
      try {
        await downloadTranscript(data);
      } catch (e) {
        toast.error(`Issued ${data.serial}, but the PDF could not be downloaded: ${errorMessage(e)} Print it from the list.`);
      }
      toast.success(`Transcript ${data.serial} issued.`);
      onIssued?.(data);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setPending(false);
    }
  }

  const blocked = preview && (!preview.can_issue || !preview.user_can_issue);
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBadge className="size-5" /> Issue official transcript
          </DialogTitle>
          <DialogDescription>
            {preview ? `${preview.student.full_name} · ${preview.student.student_number}` : "Checking the record…"}
          </DialogDescription>
        </DialogHeader>
        {!preview && !error && <Skeleton className="h-32" />}
        {preview && (
          <div className="space-y-4">
            <dl className="grid grid-cols-3 gap-3 rounded-lg border p-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">CGPA</dt>
                <dd className="font-semibold tabular-nums">{preview.summary.cgpa ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Credits earned</dt>
                <dd className="font-semibold tabular-nums">
                  {preview.summary.credits_earned}
                  {preview.summary.required_credits ? ` / ${preview.summary.required_credits}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Semesters</dt>
                <dd className="font-semibold tabular-nums">{preview.semesters}</dd>
              </div>
            </dl>
            {!preview.user_can_issue && (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertTitle>You can&rsquo;t issue official transcripts</AlertTitle>
                <AlertDescription>An administrator can grant this permission under Staff accounts.</AlertDescription>
              </Alert>
            )}
            {!preview.can_issue && (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertTitle>No published results</AlertTitle>
                <AlertDescription>There is nothing to put on a transcript yet.</AlertDescription>
              </Alert>
            )}
            {preview.can_issue && preview.is_interim && (
              <Alert>
                <AlertTriangle />
                <AlertTitle>This will be an interim transcript</AlertTitle>
                <AlertDescription>
                  {preview.interim_reason}. It will be labelled &ldquo;Interim&rdquo; and list published results only.
                  {preview.unpublished_results > 0 &&
                    ` ${preview.unpublished_results} result${preview.unpublished_results === 1 ? " is" : "s are"} not yet published and will not appear.`}
                </AlertDescription>
              </Alert>
            )}
            {!blocked && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="transcript-purpose">
                    Purpose or addressed to<span className="text-destructive"> *</span>
                  </Label>
                  <Input
                    id="transcript-purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g. Graduate application – University of Ghana"
                    maxLength={255}
                  />
                </div>
                <fieldset className="space-y-2">
                  <legend className="mb-1.5 text-sm font-medium">Signing</legend>
                  <SigningOption
                    value="HAND"
                    current={signing}
                    onSelect={setSigning}
                    icon={PenLine}
                    title="Print for hand signing and stamping"
                    hint="Leaves a signature line and a stamp box for the designated authority."
                  />
                  <SigningOption
                    value="DIGITAL"
                    current={signing}
                    onSelect={setSigning}
                    icon={Stamp}
                    disabled={!preview.digital_signing_available}
                    title="Include the uploaded signature and seal"
                    hint={
                      preview.digital_signing_available
                        ? "For PDFs sent electronically."
                        : "Upload a signature and seal under Institution settings to use this."
                    }
                  />
                </fieldset>
                {preview.previously_issued > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {preview.previously_issued} transcript{preview.previously_issued === 1 ? " has" : "s have"} already been
                    issued for this student. Earlier ones stay valid unless you revoke them.
                  </p>
                )}
              </>
            )}
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          {!blocked && (
            <Button onClick={submit} disabled={!preview || pending || !purpose.trim()}>
              {pending && <Loader2 className="animate-spin" />}
              Issue and download
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SigningOption({ value, current, onSelect, icon: Icon, title, hint, disabled = false }) {
  const selected = current === value;
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors",
        selected && "border-primary bg-primary/5",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="radio"
        name="signing"
        value={value}
        checked={selected}
        disabled={disabled}
        onChange={() => onSelect(value)}
        className="mt-1 accent-[var(--primary)]"
      />
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}
