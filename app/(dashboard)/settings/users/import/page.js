"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeader, RoleGate } from "@/components/common";
import { useAuth } from "@/components/auth/auth-provider";
import { ImportCredentials, PasswordModeSelect } from "@/components/import-credentials";
import { ImportWizard } from "@/components/import-wizard";
import { Button } from "@/components/ui/button";

const COLUMNS = [
  { header: "Name", cell: (r) => `${r.title ? `${r.title} ` : ""}${r.first_name || ""} ${r.last_name || ""}` },
  { header: "Email", cell: (r) => r.email },
  { header: "Staff ID", cell: (r) => r.staff_id || "—" },
  { header: "Role", cell: (r) => r.role },
];

export default function ImportStaffPage() {
  const { institution } = useAuth();
  const [passwordMode, setPasswordMode] = useState("generate");
  return (
    <RoleGate roles={["ADMIN"]}>
      <PageHeader
        title="Import staff accounts"
        description="Create lecturers, registrars, results officers and administrators from a CSV or Excel file."
        actions={
          <Button variant="outline" asChild>
            <Link href="/settings/users">Staff accounts</Link>
          </Button>
        }
      />
      <ImportWizard
        previewUrl="/users/import/preview/"
        confirmUrl="/users/import/confirm/"
        templateUrl="/users/import/template/"
        templateName="staff-import-template"
        instructions="Required: email, first_name, last_name, role (ADMIN, REGISTRAR, LECTURER or RESULTS_OFFICER). Optional: title, phone, staff_id, password. Choose how people get their first password: generated temporary passwords printed as slips (no email used), the file's password column, or an emailed set-up link. Temporary passwords must be changed at first sign-in. Result permissions follow the role defaults and can be changed afterwards."
        columns={COLUMNS}
        confirmLabel="Create"
        extraBody={{ password_mode: passwordMode }}
        confirmExtra={<PasswordModeSelect value={passwordMode} onChange={setPasswordMode} allowEmail />}
        renderDone={(d) => <ImportCredentials credentials={d.credentials} identifierLabel="Staff ID" institution={institution?.name} />}
        successMessage={(d) =>
          `${d.created} account(s) created.${
            !d.emails_sent
              ? d.credentials?.length
                ? " Print or download the temporary passwords below."
                : " Set temporary passwords from Staff accounts."
              : d.emails_waiting
                ? ` Password set-up emails are being sent; ${d.emails_waiting} will go out over the next day(s) because of the daily email limit. Set temporary passwords for anyone who needs access sooner.`
                : " Password set-up emails were sent."
          }`
        }
      />
    </RoleGate>
  );
}
