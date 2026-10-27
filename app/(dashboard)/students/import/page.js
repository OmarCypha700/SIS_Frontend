"use client";

import Link from "next/link";

import { PageHeader, RoleGate } from "@/components/common";
import { ImportWizard } from "@/components/import-wizard";
import { Button } from "@/components/ui/button";

const COLUMNS = [
  { header: "Name", cell: (r) => `${r.first_name || ""} ${r.last_name || ""}` },
  { header: "Email", cell: (r) => r.email },
  { header: "Programme / level", cell: (r) => `${r.programme_code || "—"} · ${r.level || "—"}` },
];

export default function ImportStudentsPage() {
  return (
    <RoleGate roles={["ADMIN", "REGISTRAR"]}>
      <PageHeader
        title="Import students"
        description="Upload a CSV or Excel file, review every row, then confirm. All valid rows are created together."
        actions={
          <Button variant="outline" asChild>
            <Link href="/students">Student records</Link>
          </Button>
        }
      />
      <ImportWizard
        previewUrl="/students/import/preview/"
        confirmUrl="/students/import/confirm/"
        templateUrl="/students/import/template/"
        templateName="student-import-template"
        instructions="Required columns: first_name, last_name, email, programme_code, level, admission_year. Optional: student_number, middle_name, phone, gender, date_of_birth (YYYY-MM-DD), admission_date, status. Up to 2,000 rows, 5 MB."
        columns={COLUMNS}
        confirmLabel="Import"
        successMessage={(d) => `${d.created} student record(s) were created.`}
      />
    </RoleGate>
  );
}
