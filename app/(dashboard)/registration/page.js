"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingBlock, PageHeader, RoleGate, StatusBadge } from "@/components/common";
import { CourseSelector, CreditSummary, RegistrationErrors, useCourseSelection } from "@/components/registration/course-selector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { formatDateTime, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function StudentRegistrationPage() {
  const { data, error, loading, reload, setData } = useApi("/registrations/current/");
  const { selected, toggle, totals } = useCourseSelection(data);
  const [step, setStep] = useState("select");
  const [submitError, setSubmitError] = useState(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setSubmitError(null);
    try {
      const response = await api.post("/registrations/submit/", { offering_ids: [...selected], semester: data.semester.id });
      setData((prev) => ({ ...prev, registration: response.data }));
      setStep("done");
      toast.success("Registration submitted.");
      reload();
    } catch (err) {
      setSubmitError(err);
      setStep("select");
    } finally {
      setPending(false);
    }
  }

  const reviewDisabled =
    !data || !data.window_open || !data.can_register || Boolean(data.financial_clearance?.message) || selected.size === 0;
  const reviewLabel = data?.registration ? "Review changes" : "Review registration";
  function startReview() {
    setSubmitError(null);
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const showActionBar = data && step === "select" && data.can_register && data.window_open && data.options.length > 0;
  const limits = data?.credit_limits || {};
  const outOfRange = (limits.min && totals.credits < limits.min) || (limits.max && totals.credits > limits.max);

  return (
    <RoleGate roles={["STUDENT"]}>
      <PageHeader title="Course registration" description={data?.semester?.name} />
      {loading && !data && <LoadingBlock rows={6} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <div className={`grid gap-6 lg:grid-cols-3 ${showActionBar ? "pb-20 lg:pb-0" : ""}`}>
          <div className="space-y-4 lg:col-span-2">
            {!data.can_register && (
              <Alert variant="destructive">
                <AlertTitle>Registration is not available for your current status</AlertTitle>
                <AlertDescription>Please contact the registry for assistance.</AlertDescription>
              </Alert>
            )}
            {data.can_register && data.financial_clearance?.message && (
              <Alert variant="destructive">
                <AlertTitle>Financial clearance required</AlertTitle>
                <AlertDescription>
                  <p>{data.financial_clearance.message}</p>
                  <Button asChild size="sm" variant="outline" className="mt-2">
                    <Link href="/fees">Pay fees</Link>
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {data.can_register && !data.window_open && (
              <Alert variant="warning">
                <AlertTitle>Registration is closed</AlertTitle>
                <AlertDescription>{data.window_message}</AlertDescription>
              </Alert>
            )}
            {submitError && <RegistrationErrors error={submitError} />}

            {step === "done" && data.registration ? (
              <Card>
                <CardHeader>
                  <CheckCircle2 className="size-8 text-emerald-600" />
                  <CardTitle>Registration received</CardTitle>
                  <CardDescription>
                    {data.registration.status === "PENDING"
                      ? "Your registration is awaiting approval by the registry."
                      : "You are registered for the courses below."}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="gap-2">
                  <Button asChild>
                    <Link href={`/registration/slip/${data.registration.id}`}>View registration slip</Link>
                  </Button>
                  <Button variant="outline" onClick={() => setStep("select")}>
                    Back to courses
                  </Button>
                </CardFooter>
              </Card>
            ) : step === "review" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Review your selection</CardTitle>
                  <CardDescription>Check the list before submitting. The registry may review registrations that need approval.</CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-6">Course</TableHead>
                        <TableHead className="hidden sm:table-cell">Category</TableHead>
                        <TableHead className="pr-6 text-right">Credits</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {totals.courses.map((o) => (
                        <TableRow key={o.offering}>
                          <TableCell className="pl-6 whitespace-normal">
                            <span className="font-medium">{o.course_code}</span> {o.course_title}
                            <span className="block text-xs text-muted-foreground sm:hidden">
                              {o.is_compulsory ? "Compulsory" : titleCase(o.category)}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{o.is_compulsory ? "Compulsory" : titleCase(o.category)}</TableCell>
                          <TableCell className="pr-6 text-right tabular-nums">{o.credits}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
                <CardFooter className="justify-between gap-2">
                  <Button variant="outline" onClick={() => setStep("select")} disabled={pending}>
                    <ArrowLeft /> Change selection
                  </Button>
                  <Button onClick={submit} disabled={pending}>
                    {pending && <Loader2 className="animate-spin" />}
                    Submit registration
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Available courses</CardTitle>
                  <CardDescription>Compulsory courses for your level are selected for you.</CardDescription>
                </CardHeader>
                <CardContent>
                  <CourseSelector
                    options={data.options}
                    selected={selected}
                    onToggle={toggle}
                    disabled={!data.window_open || !data.can_register}
                  />
                </CardContent>
              </Card>
            )}
          </div>
          <div className="order-first space-y-4 lg:order-none">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>
                  {data.student.programme} · {data.student.level}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CreditSummary credits={totals.credits} limits={data.credit_limits} />
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Closes</dt>
                    <dd>{formatDateTime(data.semester.registration_end)}</dd>
                  </div>
                  {data.semester.add_drop_deadline && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Add/drop until</dt>
                      <dd>{formatDateTime(data.semester.add_drop_deadline)}</dd>
                    </div>
                  )}
                  {data.registration && (
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Current status</dt>
                      <dd>
                        <StatusBadge status={data.registration.status} label={data.registration.status_display} />
                      </dd>
                    </div>
                  )}
                </dl>
                {step === "select" && (
                  <Button className="w-full" disabled={reviewDisabled} onClick={startReview}>
                    <ClipboardCheck /> {reviewLabel}
                  </Button>
                )}
                {data.registration && (
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/registration/slip/${data.registration.id}`}>Registration slip</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      {data && data.options.length === 0 && !loading && step === "select" && (
        <EmptyState title="No courses available" description="No course offerings are open to you in this semester." />
      )}
      {showActionBar && (
        // Phones: the summary card is above the course list, so keep the next step within thumb reach.
        <div
          role="region"
          aria-label="Registration actions"
          className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-medium tabular-nums">
                {totals.credits} credits · {selected.size} course{selected.size === 1 ? "" : "s"}
              </p>
              {Boolean(limits.min || limits.max) && (
                <p className={cn("text-xs text-muted-foreground", outOfRange && "font-medium text-destructive")}>
                  Allowed {limits.min ?? 0}–{limits.max ?? "∞"}
                </p>
              )}
            </div>
            <Button disabled={reviewDisabled} onClick={startReview}>
              <ClipboardCheck /> {reviewLabel}
            </Button>
          </div>
        </div>
      )}
    </RoleGate>
  );
}
