"use client";

import { useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common";
import { StudentPhoto } from "@/components/students/student-photo";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";

/** The student's photo on their record, with upload / replace / remove for the registry. */
export function PhotoCard({ student, canEdit, onChange }) {
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState(false);
  const inputId = `photo-${student.id}`;

  async function upload(file) {
    if (!file) return;
    setPending(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const { data } = await api.put(`/students/${student.id}/photo/`, body);
      toast.success(student.photo_url ? "Photo replaced." : "Photo added.");
      onChange(data);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <StudentPhoto src={student.photo_url} name={student.full_name} size="lg" />
      {canEdit && (
        <div className="flex flex-wrap justify-center gap-1">
          <Button variant="outline" size="sm" asChild disabled={pending}>
            <label htmlFor={inputId} className="cursor-pointer">
              {pending ? <Loader2 className="animate-spin" /> : <Upload />}
              {student.photo_url ? "Replace" : "Upload photo"}
              <input
                id={inputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
          </Button>
          {student.photo_url && (
            <Button variant="ghost" size="sm" onClick={() => setRemoving(true)} disabled={pending} aria-label="Remove photo">
              <Trash2 />
            </Button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title="Remove this photo?"
        description="The student will show their initials until a new photo is uploaded."
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          try {
            await api.delete(`/students/${student.id}/photo/`);
            toast.success("Photo removed.");
            onChange({ ...student, photo_url: null, thumbnail_url: null });
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
    </div>
  );
}
