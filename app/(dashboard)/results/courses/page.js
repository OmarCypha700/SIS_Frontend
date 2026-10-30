"use client";

import Link from "next/link";

import { PageHeader, RoleGate, StatusBadge } from "@/components/common";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";

const COLUMNS = [
  {
    key: "course_code",
    header: "Course",
    sortKey: "course__code",
    cell: (r) => (
      <>
        <span className="font-medium">{r.course_code}</span>
        <span className="block text-xs text-muted-foreground">{r.course_title}</span>
      </>
    ),
  },
  { key: "semester_name", header: "Semester" },
  { key: "enrolled_count", header: "Students" },
  { key: "result_status", header: "Results", cell: (r) => <StatusBadge status={r.result_status || "DRAFT"} label={r.result_status ? undefined : "Not started"} /> },
  {
    key: "open",
    header: <span className="sr-only">Open</span>,
    className: "text-right",
    cell: (r) => (
      <div className="flex justify-end gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/class-lists/${r.id}`}>Class list</Link>
        </Button>
        <Button asChild size="sm">
          <Link href={`/results/courses/${r.id}`}>Marks</Link>
        </Button>
      </div>
    ),
  },
];

// Only courses assigned to me, even for a registrar or results officer who can see every course.
const MINE = { mine: "true" };

export default function LecturerCoursesPage() {
  return (
    <RoleGate roles={["LECTURER"]}>
      <PageHeader title="My courses" description="Course offerings assigned to you. Open one to enter and submit marks." />
      <DataTable
        endpoint="/course-offerings/"
        params={MINE}
        columns={COLUMNS}
        searchPlaceholder="Search course…"
        filters={[{ key: "semester", label: "Semester", endpoint: "/semesters/", optionLabel: (s) => `${s.academic_year_name} ${s.name}` }]}
        emptyTitle="No courses assigned"
        emptyDescription="Courses appear here when the registry assigns you as a lecturer."
      />
    </RoleGate>
  );
}
