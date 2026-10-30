"use client";

import Link from "next/link";
import {
  AlertTriangle, BadgeCheck, BookOpen, CalendarClock, CheckCircle2, ClipboardCheck, FilePen, GraduationCap, ListChecks, Mail, Users,
} from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState, ErrorState, LoadingBlock, PageHeader, StatCard, StatusBadge } from "@/components/common";
import { BarList } from "@/components/dashboard/bar-list";
import { StudentPhoto } from "@/components/students/student-photo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi("/dashboard/");

  return (
    <>
      <PageHeader title={`Welcome, ${user.first_name}`} description={data?.current_semester?.label || "No current semester is set"} />
      {loading && !data && <LoadingBlock rows={6} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data?.kind === "registry" && <RegistryDashboard data={data} />}
      {user.role === "ADMIN" && <DeliveryCard />}
      {data?.kind === "results_officer" && <OfficerDashboard data={data} />}
      {data?.teaching && (
        <div className="mt-6">
          <TeachingCard courses={data.teaching} title="Courses I teach this semester" />
        </div>
      )}
      {data?.appointments_review?.length > 0 && <AppointmentsReviewCard items={data.appointments_review} />}
      {data?.kind === "lecturer" && <LecturerDashboard data={data} />}
      {data?.kind === "student" && <StudentDashboard data={data} />}
    </>
  );
}

function SemesterCard({ semester }) {
  if (!semester) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Academic period</CardTitle>
          <CardDescription>No current semester has been set.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  const rows = [
    ["Semester", `${semester.academic_year} · ${semester.name}`],
    ["Registration opens", formatDateTime(semester.registration_start)],
    ["Registration closes", formatDateTime(semester.registration_end)],
    ["Add/drop deadline", formatDateTime(semester.add_drop_deadline)],
    ["Result entry deadline", formatDateTime(semester.result_entry_deadline)],
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="size-4" /> Academic period
        </CardTitle>
        <CardDescription>
          {semester.registration_open ? "Registration is open." : "Registration is closed."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

/** Administrators: how much of today's email allowance is used and whether push is set up. */
function DeliveryCard() {
  const { data } = useApi("/notifications/delivery-status/");
  if (!data) return null;
  const { email, push } = data;
  const used = email.limit ? Math.min(100, Math.round((email.sent_today / email.limit) * 100)) : 0;
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-5" /> Notification delivery
        </CardTitle>
        <CardDescription>
          Email uses the daily allowance of your email provider ({email.limit} per day, {email.security_reserve} kept for
          password resets). Push notifications and in-app notifications are unlimited.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-3">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Email sent today</p>
          <p className="text-2xl font-semibold tabular-nums">
            {email.sent_today} <span className="text-base font-normal text-muted-foreground">/ {email.limit}</span>
          </p>
          <Progress value={used} aria-label="Share of today's email allowance used" />
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Email waiting</p>
          <p className="text-2xl font-semibold tabular-nums">{email.pending}</p>
          <p className="text-xs text-muted-foreground">
            {email.failed_last_7_days ? `${email.failed_last_7_days} failed in the last 7 days` : "No failures in the last 7 days"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Devices with push</p>
          <p className="text-2xl font-semibold tabular-nums">{push.enabled ? push.devices : "Off"}</p>
          <p className="text-xs text-muted-foreground">
            {push.enabled ? `${push.pending} waiting to be sent` : "Set the VAPID keys on the server to turn push on"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Sheets nobody but their submitter could approve or publish: someone else needs the permission. */
function SignoffBlockedCard({ items }) {
  if (!items?.length) return null;
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" /> Sign-off needs attention
        </CardTitle>
        <CardDescription>
          No one other than the submitter can take the next step for these results. Give another person the permission
          under Staff accounts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y text-sm">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}-${item.step}`} className="py-2">
              <Link href={item.link} className="font-medium hover:underline">
                {item.course_code}
                {item.kind === "resit" ? " (resit)" : ""}
              </Link>
              <p className="text-muted-foreground">{item.message}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function RegistryDashboard({ data }) {
  const results = data.results || {};
  const reg = data.registration;
  return (
    <div className="space-y-6">
      <SignoffBlockedCard items={data.signoff_blocked} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active students" value={data.students.active} hint={`${data.students.total} records in total`} icon={Users} />
        <StatCard
          label="Registered this semester"
          value={reg ? reg.registered : "—"}
          hint={reg ? `${reg.not_registered} eligible students not yet registered` : "No current semester"}
          icon={ClipboardCheck}
        />
        <StatCard label="Course offerings" value={data.offerings} hint="In the current semester" icon={BookOpen} />
        <StatCard
          label="Results awaiting approval"
          value={results.SUBMITTED}
          hint={`${results.APPROVED || 0} approved, awaiting publication`}
          icon={ListChecks}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Active students by programme</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              items={data.students.by_programme.map((p) => ({ label: p.programme__code, title: p.programme__name, value: p.count }))}
              empty="No active students yet."
            />
          </CardContent>
        </Card>
        <SemesterCard semester={data.current_semester} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Active students by level</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList items={data.students.by_level.map((l) => ({ label: l.current_level__name, value: l.count }))} empty="No data yet." />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Outstanding work</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <TaskLink href="/registrations" label="Registrations awaiting approval" count={reg?.pending} />
            <TaskLink href="/registrations/not-registered" label="Eligible students not registered" count={reg?.not_registered} />
            <TaskLink href="/results/sheets" label="Result sheets awaiting review" count={results.SUBMITTED} />
            <TaskLink href="/results/sheets" label="Approved results to publish" count={results.APPROVED} />
            <TaskLink href="/results/amendments" label="Amendments awaiting approval" count={data.pending_amendments} />
          </CardContent>
        </Card>
      </div>
      {data.recent_activity && (
        <Card>
          <CardHeader>
            <CardTitle>Recent administrative activity</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent_activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <ul className="divide-y text-sm">
                {data.recent_activity.map((item) => (
                  <li key={item.id} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <span>{item.summary || item.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.actor || "System"} · {formatDateTime(item.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TaskLink({ href, label, count }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted">
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{count ?? 0}</span>
    </Link>
  );
}

function OfficerDashboard({ data }) {
  const results = data.results || {};
  return (
    <div className="space-y-6">
      <SignoffBlockedCard items={data.signoff_blocked} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Awaiting review" value={results.SUBMITTED} icon={ListChecks} />
        <StatCard label="Approved, unpublished" value={results.APPROVED} icon={CheckCircle2} />
        <StatCard label="Returned for correction" value={results.RETURNED} icon={AlertTriangle} />
        <StatCard label="Pending amendments" value={data.pending_amendments} icon={FilePen} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Oldest submissions awaiting review</CardTitle>
          </CardHeader>
          <CardContent>
            {data.awaiting_review.length === 0 ? (
              <EmptyState title="Nothing to review" description="Submitted result sheets will appear here." />
            ) : (
              <ul className="divide-y">
                {data.awaiting_review.map((sheet) => (
                  <li key={sheet.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">{sheet.course_code} · {sheet.course_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {sheet.submitted_by} · {formatDateTime(sheet.submitted_at)}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/results/sheets/${sheet.id}`}>Review</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <SemesterCard semester={data.current_semester} />
      </div>
    </div>
  );
}

function LecturerDashboard({ data }) {
  const t = data.totals;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assigned courses" value={t.courses} icon={BookOpen} />
        <StatCard label="Students taught" value={t.students} icon={Users} />
        <StatCard label="Need marks or resubmission" value={t.draft + t.returned} hint={`${t.returned} returned for correction`} icon={AlertTriangle} />
        <StatCard label="Published" value={t.published} hint={`${t.submitted} submitted for review`} icon={CheckCircle2} />
      </div>
      <TeachingCard courses={data.courses} title="My courses this semester" />
    </div>
  );
}

function TeachingCard({ courses, title }) {
  return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {courses.length === 0 ? (
            <EmptyState title="No assigned courses" description="Courses assigned to you by the registry will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Course</TableHead>
                    <TableHead>Class size</TableHead>
                    <TableHead className="min-w-40">Marks entered</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6 text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.offering}>
                      <TableCell className="pl-6">
                        <p className="font-medium">{course.course_code}</p>
                        <p className="text-xs text-muted-foreground">{course.course_title}</p>
                      </TableCell>
                      <TableCell className="tabular-nums">{course.class_size}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={course.marks_progress} className="h-1.5" aria-label="Marks entered" />
                          <span className="w-10 text-xs tabular-nums text-muted-foreground">{course.marks_progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={course.result_status} />
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Button asChild size="sm" variant={course.needs_action ? "default" : "outline"}>
                          <Link href={`/results/courses/${course.offering}`}>{course.needs_action ? "Enter marks" : "View"}</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
  );
}

/** Administrators: open-ended appointments held for over a year, and ones ending soon. */
function AppointmentsReviewCard({ items }) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BadgeCheck className="size-4" /> Appointments to review
        </CardTitle>
        <CardDescription>Confirm who holds each office, or record when the appointment ends.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={`${item.reason}-${item.id}`} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <span className="font-medium">{item.name}</span>, {item.title}
                <span className="block text-xs text-muted-foreground">
                  {item.reason === "open_ended"
                    ? `Since ${formatDate(item.starts_on)} with no end date`
                    : `Ends ${formatDate(item.ends_on)}`}
                </span>
              </span>
              <Button asChild size="sm" variant="outline">
                <Link href={`/settings/appointments?user=${item.user}`}>Review</Link>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function StudentDashboard({ data }) {
  const { user } = useAuth();
  const s = data.student;
  if (!s) return <EmptyState title="No student record" description="Your account is not linked to a student record. Contact the registry." />;
  const reg = data.registration;
  const semester = data.current_semester;
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex items-center gap-4">
          <StudentPhoto src={user.student?.photo_url} name={user.full_name} size="md" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.full_name}</p>
            <p className="text-sm text-muted-foreground">
              {user.student?.student_number} · {s.programme_code} · {s.level}
            </p>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Programme" value={<span className="text-base">{s.programme}</span>} hint={s.programme_code} icon={GraduationCap} />
        <StatCard label="Current level" value={s.level} hint={<StatusBadge status={s.status} label={s.status_display} />} />
        <StatCard label="CGPA" value={data.results?.cgpa ?? "—"} hint="Published results only" />
        <StatCard
          label="Credits earned"
          value={data.results?.credits_earned ?? "—"}
          hint={data.results?.required_credits ? `of ${data.results.required_credits} required` : undefined}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>This semester&apos;s registration</CardTitle>
              <CardDescription>{semester ? semester.label : "No current semester"}</CardDescription>
            </div>
            {reg && <StatusBadge status={reg.status} label={reg.status_display} />}
          </CardHeader>
          <CardContent>
            {reg ? (
              <>
                <ul className="divide-y text-sm">
                  {reg.courses.map((c) => (
                    <li key={c.course_code} className="flex items-center justify-between gap-3 py-2">
                      <span>
                        <span className="font-medium">{c.course_code}</span> · {c.course_title}
                      </span>
                      <span className="text-muted-foreground">{c.credits} cr · {titleCase(c.category)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="font-medium">Total credits: {reg.total_credits}</span>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/registration/slip/${reg.id}`}>Registration slip</Link>
                  </Button>
                </div>
              </>
            ) : (
              <EmptyState
                title="You have not registered yet"
                description={semester?.registration_open ? `Registration closes ${formatDate(semester.registration_end)}.` : "Registration is currently closed."}
                action={
                  semester?.registration_open && s.can_register ? (
                    <Button asChild>
                      <Link href="/registration">Register courses</Link>
                    </Button>
                  ) : null
                }
              />
            )}
          </CardContent>
        </Card>
        <SemesterCard semester={semester} />
      </div>
      {data.results?.latest && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Latest published results</CardTitle>
              <CardDescription>
                {data.results.latest.academic_year} · {data.results.latest.semester} — GPA {data.results.latest.gpa}
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/my-results">All results</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {data.results.latest.courses.map((c) => (
                <li key={c.course_code} className="flex justify-between py-2">
                  <span>
                    <span className="font-medium">{c.course_code}</span> · {c.course_title}
                  </span>
                  <span className="font-semibold">{c.grade}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
