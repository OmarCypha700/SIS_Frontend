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
        <div className="overflow-x-auto">
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
                <TableRow key={course.course_code}>
                  <TableCell className="pl-6 font-medium">{course.course_code}</TableCell>
                  <TableCell>
                    {course.course_title}
                    {course.is_retake && <Badge variant="outline" className="ml-2">Retake</Badge>}
                    {course.is_amended && <Badge variant="outline" className="ml-2">Amended</Badge>}
                    {course.is_resit && <Badge variant="outline" className="ml-2">Resit</Badge>}
                    {course.grade_capped && <Badge variant="outline" className="ml-2">Grade capped</Badge>}
                    {course.is_published === false && <Badge variant="secondary" className="ml-2">Unpublished</Badge>}
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
