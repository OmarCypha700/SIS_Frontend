"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeader, RoleGate } from "@/components/common";
import { useAuth } from "@/components/auth/auth-provider";
import { ImportCredentials, PasswordModeSelect } from "@/components/import-credentials";
import { ImportWizard } from "@/components/import-wizard";
import { Button } from "@/components/ui/button";

const COLUMNS = [
  { header: "Name", cell: (r) => `${r.first_name || ""} ${r.last_name || ""}` },
  { header: "Email", cell: (r) => r.email },
  { header: "Programme / level", cell: (r) => `${r.programme_code || "—"} · ${r.level || "—"}` },
];

export default function ImportStudentsPage() {
  const { institution } = useAuth();
  const [passwordMode, setPasswordMode] = useState("generate");
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
        instructions="Required columns: first_name, last_name, email, programme_code, level, admission_year. Optional: student_number, middle_name, phone, gender, date_of_birth (YYYY-MM-DD), admission_date, status, password. Up to 2,000 rows, 5 MB. Temporary passwords can be generated for you and printed as sign-in slips; students must change them at first sign-in."
        columns={COLUMNS}
        confirmLabel="Import"
        extraBody={{ password_mode: passwordMode }}
        confirmExtra={<PasswordModeSelect value={passwordMode} onChange={setPasswordMode} allowNone />}
        successMessage={(d) => `${d.created} student record(s) were created.`}
        renderDone={(d) => (
          <ImportCredentials credentials={d.credentials} identifierLabel="Student number" institution={institution?.name} />
        )}
      />
    </RoleGate>
  );
}
