"use client";

import { useState } from "react";
import { Ban, Loader2, MoreHorizontal, Printer } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common";
import { downloadTranscript } from "@/components/transcripts/issue-transcript-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, errorMessage } from "@/lib/api";

/** Print (reprint) and revoke for one register entry. Only shown to people who may issue. */
export function TranscriptActions({ transcript, onChanged }) {
  const [revoking, setRevoking] = useState(false);
  const [printing, setPrinting] = useState(false);
  const revoked = transcript.status === "REVOKED";

  async function print() {
    setPrinting(true);
    try {
      await downloadTranscript(transcript);
      onChanged?.();
    } catch (e) {
      toast.error(errorMessage(e, "The PDF could not be generated."));
    } finally {
      setPrinting(false);
    }
  }

  if (revoked) return null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${transcript.serial}`}>
            {printing ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={print}>
            <Printer /> {transcript.print_count ? "Reprint" : "Print"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setRevoking(true)}>
            <Ban /> Revoke
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={revoking}
        onOpenChange={setRevoking}
        title={`Revoke ${transcript.serial}?`}
        description="Anyone who checks this transcript's code will see that it has been revoked, and it can no longer be printed. Use this when a result was amended or the transcript was issued in error, then issue a new one."
        confirmLabel="Revoke transcript"
        destructive
        requireReason
        onConfirm={async (reason) => {
          try {
            await api.post(`/transcripts/${transcript.id}/revoke/`, { reason });
            toast.success(`${transcript.serial} revoked.`);
            onChanged?.();
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
    </>
  );
}
