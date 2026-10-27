"use client";

import Link from "next/link";

import { PageHeader, RoleGate } from "@/components/common";
import { ImportWizard } from "@/components/import-wizard";
import { Button } from "@/components/ui/button";

const COLUMNS = [
  { header: "Code", cell: (r) => <span className="font-medium">{r.code}</span> },
  { header: "Title", cell: (r) => r.title },
  { header: "Credits", cell: (r) => r.credits },
  { header: "Department", cell: (r) => r.department_code },
  { header: "Prerequisites", cell: (r) => r.prerequisites || "—" },
  { header: "Curriculum", cell: (r) => (r.programme_code ? `${r.programme_code} · ${r.level} · term ${r.term_number} · ${r.category || "COMPULSORY"}` : "—") },
];

export default function ImportCoursesPage() {
  return (
    <RoleGate roles={["ADMIN"]}>
      <PageHeader
        title="Import courses"
        description="Add many courses at once from a CSV or Excel file, optionally placing them in a programme's curriculum."
        actions={
          <Button variant="outline" asChild>
            <Link href="/academics/courses">Course catalogue</Link>
          </Button>
        }
      />
      <ImportWizard
        previewUrl="/courses/import/preview/"
        confirmUrl="/courses/import/confirm/"
        templateUrl="/courses/import/template/"
        templateName="course-import-template"
        instructions="Required: code, title, credits, department_code. Optional: course_type (THEORY, PRACTICAL, CLINICAL, PROJECT, SEMINAR, OTHER), description, prerequisites (course codes separated by ;). To add the course to a programme's curriculum also give programme_code, level (e.g. Level 100), term_number and category (COMPULSORY or ELECTIVE). Prerequisites may refer to courses in the same file."
        columns={COLUMNS}
        confirmLabel="Import"
        successMessage={(d) => `${d.created} course(s) created, ${d.placements} curriculum placement(s).`}
      />
    </RoleGate>
  );
}
