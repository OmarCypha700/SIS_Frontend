"use client";

import { EmptyState, ErrorState, LoadingBlock } from "@/components/common";
import { ExportMenu } from "@/components/export-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StudentPhoto } from "@/components/students/student-photo";
import { useApi } from "@/hooks/use-api";
import { titleCase } from "@/lib/format";

export function ClassList({ offeringId }) {
  const { data, error, loading, reload } = useApi(`/class-lists/${offeringId}/`);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Class list</CardTitle>
          <CardDescription>{data ? `${data.count} registered student(s)` : "Registered students"}</CardDescription>
        </div>
        {data?.count > 0 && (
          <ExportMenu url={`/class-lists/${offeringId}/`} formatParam="export" filename="class-list" size="sm" />
        )}
      </CardHeader>
      <CardContent className="px-0">
        {loading && !data && <LoadingBlock className="px-6" />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {data && data.count === 0 && <EmptyState title="No students registered yet" />}
        {data && data.count > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Student number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Programme</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="pr-6">Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.students.map((s) => (
                  <TableRow key={s.registration}>
                    <TableCell className="pl-6 font-medium">{s.student_number}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2.5">
                        <StudentPhoto src={s.thumbnail_url} name={s.full_name} size="sm" />
                        {s.full_name}
                      </span>
                      {s.is_retake && <Badge variant="outline" className="ml-2">Retake</Badge>}
                    </TableCell>
                    <TableCell>{s.programme_code}</TableCell>
                    <TableCell>{s.level_name}</TableCell>
                    <TableCell className="pr-6">{titleCase(s.category)}</TableCell>
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
