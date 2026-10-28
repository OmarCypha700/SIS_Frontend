"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/api";

/**
 * Deletes a record created in error. Checks first and, when the record has any history,
 * explains why it cannot be deleted instead of offering the button.
 * `endpoint` is the record URL, e.g. /students/12/.
 */
export function DeleteRecordDialog({ name, noun = "record", endpoint, onClose, onDeleted }) {
  const [check, setCheck] = useState(null);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api
      .get(`${endpoint}deletion-check/`)
      .then(({ data }) => setCheck(data))
      .catch((error) => setCheck({ can_delete: false, blockers: [errorMessage(error)] }));
  }, [endpoint]);

  async function remove() {
    setPending(true);
    try {
      await api.post(`${endpoint}delete-record/`, { reason: reason.trim() });
      toast.success(`${name} deleted.`);
      onClose();
      onDeleted();
    } catch (error) {
      toast.error(errorMessage(error));
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {name}?</DialogTitle>
          <DialogDescription>
            Only for a {noun} created in error, such as a duplicate or a typo. It is permanently removed; the deletion and
            your reason are kept in the audit log.
          </DialogDescription>
        </DialogHeader>
        {!check && <Skeleton className="h-20" />}
        {check && !check.can_delete && (
          <Alert>
            <ShieldAlert />
            <AlertTitle>This {noun} can&rsquo;t be deleted</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {check.blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="mt-2">Deactivate it instead: access is removed and its history is kept.</p>
            </AlertDescription>
          </Alert>
        )}
        {check?.can_delete && (
          <div className="space-y-1.5">
            <Label htmlFor="delete-reason">
              Reason<span className="text-destructive"> *</span>
            </Label>
            <Textarea
              id="delete-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Duplicate created by the January import"
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {check && !check.can_delete ? "Close" : "Cancel"}
          </Button>
          {check?.can_delete && (
            <Button variant="destructive" onClick={remove} disabled={pending || !reason.trim()}>
              {pending && <Loader2 className="animate-spin" />}
              Delete permanently
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
