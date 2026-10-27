"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeader, RoleGate } from "@/components/common";
import { ImportWizard } from "@/components/import-wizard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const COLUMNS = [
  { header: "Name", cell: (r) => `${r.title ? `${r.title} ` : ""}${r.first_name || ""} ${r.last_name || ""}` },
  { header: "Email", cell: (r) => r.email },
  { header: "Staff ID", cell: (r) => r.staff_id || "—" },
  { header: "Role", cell: (r) => r.role },
];

export default function ImportStaffPage() {
  const [sendEmails, setSendEmails] = useState(true);
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
        instructions="Required: email, first_name, last_name, role (ADMIN, REGISTRAR, LECTURER or RESULTS_OFFICER). Optional: title, phone, staff_id. Passwords are never imported: each person receives an email link to choose their own. Result permissions follow the role defaults and can be changed afterwards."
        columns={COLUMNS}
        confirmLabel="Create"
        extraBody={{ send_setup_emails: sendEmails }}
        confirmExtra={
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={sendEmails} onCheckedChange={(v) => setSendEmails(Boolean(v))} />
            Email each person a link to set their password
          </label>
        }
        successMessage={(d) =>
          `${d.created} account(s) created.${d.emails_sent ? " Password set-up emails were sent." : " Set temporary passwords from Staff accounts."}`
        }
      />
    </RoleGate>
  );
}
