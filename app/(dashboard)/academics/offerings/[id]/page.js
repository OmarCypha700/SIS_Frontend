"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { hasRole, useAuth } from "@/components/auth/auth-provider";
import { DescriptionList, ErrorState, LoadingBlock, PageHeader, StatusBadge } from "@/components/common";
import { ClassList } from "@/components/class-list";
import { NativeSelect } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";

export default function OfferingDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: offering, error, loading, reload, setData } = useApi(`/course-offerings/${id}/`);

  if (loading && !offering) return <LoadingBlock />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${offering.course_code} · ${offering.course_title}`}
        description={offering.semester_name}
        actions={
          <Button asChild variant="outline">
            <Link href={`/results/courses/${offering.id}`}>Result sheet</Link>
          </Button>
        }
      />
      <Card>
        <CardContent>
          <DescriptionList
            className="lg:grid-cols-4"
            items={[
              { label: "Credits", value: offering.credits },
              { label: "Department", value: offering.department_name },
              { label: "Enrolled", value: `${offering.enrolled_count}${offering.capacity ? ` of ${offering.capacity}` : ""}` },
              { label: "Status", value: <StatusBadge status={offering.status} /> },
            ]}
          />
        </CardContent>
      </Card>
      {hasRole(user, "ADMIN", "REGISTRAR") && <LecturerEditor offering={offering} onSaved={setData} />}
      <ClassList offeringId={offering.id} />
    </div>
  );
}

function LecturerEditor({ offering, onSaved }) {
  const { data } = useApi("/users/lecturers/", { page_size: 200 });
  const lecturers = data?.results ?? [];
  const [rows, setRows] = useState(() =>
    offering.assignments.map((a) => ({ lecturer: String(a.lecturer), is_coordinator: a.is_coordinator })),
  );
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      const response = await api.put(`/course-offerings/${offering.id}/lecturers/`, {
        lecturers: rows.filter((r) => r.lecturer).map((r) => ({ lecturer: Number(r.lecturer), is_coordinator: r.is_coordinator })),
      });
      onSaved(response.data);
      toast.success("Lecturer assignments saved.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lecturers</CardTitle>
        <CardDescription>Assigned lecturers can see the class list and enter marks for this offering only.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <NativeSelect
              aria-label="Lecturer"
              value={row.lecturer}
              onChange={(e) => setRows((prev) => prev.map((r, i) => (i === index ? { ...r, lecturer: e.target.value } : r)))}
              className="sm:max-w-sm"
            >
              <option value="">Select lecturer…</option>
              {lecturers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.full_name} ({l.email})
                </option>
              ))}
            </NativeSelect>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={row.is_coordinator}
                onCheckedChange={(v) => setRows((prev) => prev.map((r, i) => (i === index ? { ...r, is_coordinator: Boolean(v) } : r)))}
              />
              Coordinator
            </label>
            <Button variant="ghost" size="icon-sm" aria-label="Remove lecturer" onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setRows((prev) => [...prev, { lecturer: "", is_coordinator: false }])}>
            <Plus /> Add lecturer
          </Button>
          <Button size="sm" onClick={save} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Save assignments
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
