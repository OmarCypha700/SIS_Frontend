"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { ErrorState, LoadingBlock, PageHeader, RoleGate } from "@/components/common";
import { Field } from "@/components/forms/field";
import { CourseSelector, CreditSummary, RegistrationErrors, useCourseSelection } from "@/components/registration/course-selector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useApi, useDebounced } from "@/hooks/use-api";
import { api } from "@/lib/api";

export default function RegisterOnBehalfPage() {
  const params = useSearchParams();
  const [studentId, setStudentId] = useState(params.get("student") || "");
  return (
    <RoleGate roles={["ADMIN", "REGISTRAR"]}>
      <PageHeader
        title="Register a student"
        description="Register courses on a student's behalf, for example after the window has closed. A reason is required and the action is logged."
      />
      {studentId ? <OnBehalfForm studentId={studentId} onChangeStudent={() => setStudentId("")} /> : <StudentPicker onPick={setStudentId} />}
    </RoleGate>
  );
}

function StudentPicker({ onPick }) {
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const { data, loading } = useApi(debounced.length >= 2 ? "/students/" : null, { search: debounced, page_size: 10 });
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Find the student</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="Student number or name (at least 2 characters)" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search students" />
        </div>
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        <ul className="divide-y rounded-lg border empty:hidden">
          {(data?.results ?? []).map((s) => (
            <li key={s.id}>
              <button type="button" className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => onPick(String(s.id))}>
                <span>
                  <span className="font-medium">{s.student_number}</span> {s.full_name}
                </span>
                <span className="text-muted-foreground">
                  {s.programme_code} · {s.level_name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function OnBehalfForm({ studentId, onChangeStudent }) {
  const router = useRouter();
  const { data, error, loading, reload } = useApi("/registrations/options/", { student: studentId });
  const { selected, toggle, totals } = useCourseSelection(data);
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState(null);
  const [pending, setPending] = useState(false);

  if (loading && !data) return <LoadingBlock rows={6} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  async function submit() {
    setPending(true);
    setSubmitError(null);
    try {
      const response = await api.post("/registrations/on-behalf/", {
        student: Number(studentId), semester: data.semester.id, offering_ids: [...selected], reason,
      });
      toast.success("Registration saved.");
      router.push(`/registrations/${response.data.id}`);
    } catch (err) {
      setSubmitError(err);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {!data.can_register && (
          <Alert variant="destructive">
            <AlertDescription>This student&apos;s status does not allow registration.</AlertDescription>
          </Alert>
        )}
        {!data.window_open && (
          <Alert>
            <AlertDescription>{data.window_message} As registry staff you may still register this student.</AlertDescription>
          </Alert>
        )}
        {submitError && <RegistrationErrors error={submitError} />}
        <Card>
          <CardHeader>
            <CardTitle>Courses · {data.semester.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <CourseSelector options={data.options} selected={selected} onToggle={toggle} />
          </CardContent>
        </Card>
      </div>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>{data.student.full_name}</CardTitle>
          <CardDescription>
            {data.student.student_number} · {data.student.programme} · {data.student.level}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CreditSummary credits={totals.credits} limits={data.credit_limits} />
          <Field id="reason" label="Reason" required>
            <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Button className="w-full" onClick={submit} disabled={pending || !reason.trim() || selected.size === 0}>
            {pending && <Loader2 className="animate-spin" />}
            Save registration
          </Button>
          <Button variant="ghost" className="w-full" onClick={onChangeStudent}>
            Choose another student
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
