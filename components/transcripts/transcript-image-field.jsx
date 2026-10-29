"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";

/**
 * Upload, preview and remove the transcript signature or seal. These are private files: the
 * preview is fetched with the administrator's session, never from a public /media/ link.
 */
export function TranscriptImageField({ kind, label, present, onChanged }) {
  const [preview, setPreview] = useState(null);
  const [pending, setPending] = useState(false);
  const inputId = `transcript-${kind}`;

  useEffect(() => {
    if (!present) return undefined;
    let url = null;
    let cancelled = false;
    api
      .get(`/institution/transcript-images/${kind}/`, { responseType: "blob" })
      .then(({ data }) => {
        if (cancelled) return;
        url = URL.createObjectURL(data);
        setPreview(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [kind, present]);

  async function upload(file) {
    if (!file) return;
    setPending(true);
    try {
      const body = new FormData();
      body.append("file", file);
      await api.put(`/institution/transcript-images/${kind}/`, body);
      toast.success(`${label} uploaded.`);
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      await api.delete(`/institution/transcript-images/${kind}/`);
      setPreview(null);
      toast.success(`${label} removed.`);
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed bg-muted/30">
        {present && preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={`Current ${label.toLowerCase()}`} className="max-h-20 max-w-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">{present ? "Loading…" : "None uploaded"}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" asChild disabled={pending}>
          <label htmlFor={inputId} className="cursor-pointer">
            {pending ? <Loader2 className="animate-spin" /> : <Upload />} {present ? "Replace" : "Upload"}
            <input
              id={inputId}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </Button>
        {present && (
          <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={pending}>
            <Trash2 /> Remove
          </Button>
        )}
      </div>
    </div>
  );
}
