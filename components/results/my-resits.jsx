"use client";

import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

/** A student's resit opportunities. Hidden when there are none. */
export function MyResits() {
  const { data, reload } = useApi("/my-resits/");
  const [pending, setPending] = useState(null);
  if (!data?.length) return null;

  async function register(entry) {
    setPending(entry.id);
    try {
      await api.post(`/my-resits/${entry.id}/register/`);
      toast.success(`Registered for the ${entry.course_code} resit.`);
      reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw className="size-4" /> Resits
        </CardTitle>
        <CardDescription>
          You may resit these failed courses. Register before the deadline; your result is only replaced once resit results are published.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {data.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-sm">
                <p className="font-medium">
                  {entry.course_code} · {entry.course_title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.semester_name} · original grade {entry.original_grade}
                  {entry.registration_deadline && ` · register by ${formatDateTime(entry.registration_deadline)}`}
                  {entry.new_grade && ` · resit grade ${entry.new_grade}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={entry.status} label={entry.status_display} />
                {entry.status === "ELIGIBLE" && ["DRAFT", "RETURNED"].includes(entry.sheet_status) && (
                  <Button size="sm" onClick={() => register(entry)} disabled={pending === entry.id}>
                    {pending === entry.id && <Loader2 className="animate-spin" />}
                    Register for resit
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
