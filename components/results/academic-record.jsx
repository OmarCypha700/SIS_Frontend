import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/common";

/** Semester-by-semester results with GPA/CGPA, as returned by the academic-record endpoints. */
export function AcademicRecord({ record, emptyTitle = "No results yet" }) {
  if (!record.semesters.length) {
    return <EmptyState title={emptyTitle} description="Results appear here once they have been published." />;
  }
  return (
    <div className="space-y-4">
      {record.semesters.map((semester) => (
        <SemesterResults key={semester.semester_id} semester={semester} />
      ))}
    </div>
  );
}

export function SemesterResults({ semester, compact = false }) {
  return (
    <Card className={compact ? "gap-2 py-3 shadow-none print:border-0" : undefined}>
      <CardHeader className="flex flex-row flex-wrap items-baseline justify-between gap-2">
        <CardTitle className="text-base">
          {semester.academic_year} · {semester.semester}
        </CardTitle>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>
            GPA <strong className="text-foreground">{semester.gpa ?? "—"}</strong>
          </span>
          <span>
            CGPA <strong className="text-foreground">{semester.cgpa ?? "—"}</strong>
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {/* Phones: one row per course with the grade always in view. */}
        <ul className="divide-y border-y text-sm sm:hidden print:hidden">
          {semester.courses.map((course) => (
            <li key={course.course_code} className={`flex items-start gap-3 px-4 py-3 ${course.superseded ? "text-muted-foreground" : ""}`}>
              <div className="min-w-0 flex-1">
                <p>
                  <span className="font-medium">{course.course_code}</span> · {course.course_title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  {course.credits} credits{course.total != null && course.total !== "" ? ` · score ${course.total}` : ""}
                  {course.grade_point != null && course.grade_point !== "" ? ` · ${course.grade_point} points` : ""}
                </p>
                <CourseBadges course={course} className="mt-1.5 flex flex-wrap gap-1" />
              </div>
              <span className={`w-9 shrink-0 text-right text-lg font-semibold ${course.is_pass ? "" : "text-destructive"}`}>
                {course.grade}
              </span>
            </li>
          ))}
          <li className="flex justify-between gap-3 bg-muted/50 px-4 py-2.5 font-medium">
            <span>
              Credits {semester.credits_attempted} attempted · {semester.credits_earned} earned
            </span>
            <span className="shrink-0">GPA {semester.gpa ?? "—"}</span>
          </li>
        </ul>
        <div className="hidden overflow-x-auto sm:block print:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Code</TableHead>
                <TableHead>Course</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-center">Grade</TableHead>
                <TableHead className="pr-6 text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {semester.courses.map((course) => (
                <TableRow key={course.course_code} className={course.superseded ? "text-muted-foreground" : undefined}>
                  <TableCell className="pl-6 font-medium">{course.course_code}</TableCell>
                  <TableCell>
                    {course.course_title}
                    <CourseBadges course={course} className="contents [&>*]:ml-2" />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{course.credits}</TableCell>
                  <TableCell className="text-right tabular-nums">{course.total}</TableCell>
                  <TableCell className={`text-center font-semibold ${course.is_pass ? "" : "text-destructive"}`}>{course.grade}</TableCell>
                  <TableCell className="pr-6 text-right tabular-nums">{course.grade_point}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={2} className="pl-6">
                  Credits attempted {semester.credits_attempted} · earned {semester.credits_earned}
                </TableCell>
                <TableCell colSpan={4} className="pr-6 text-right">
                  Semester GPA {semester.gpa ?? "—"}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function CourseBadges({ course, className }) {
  const badges = [
    course.is_retake && ["outline", "Retake"],
    course.is_repeat && ["outline", "Repeat year"],
    course.is_incomplete && ["secondary", "Incomplete (excused)"],
    course.superseded && ["secondary", "Superseded by repeat"],
    course.is_amended && ["outline", "Amended"],
    course.is_resit && ["outline", "Resit"],
    course.grade_capped && ["outline", "Grade capped"],
    course.is_published === false && ["secondary", "Unpublished"],
  ].filter(Boolean);
  if (!badges.length) return null;
  return (
    <span className={className}>
      {badges.map(([variant, label]) => (
        <Badge key={label} variant={variant}>
          {label}
        </Badge>
      ))}
    </span>
  );
}
