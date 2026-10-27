"use client";

import Link from "next/link";
import { useState } from "react";
import { KeyRound, Loader2, Power, Upload } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog, StatusBadge } from "@/components/common";
import { Field } from "@/components/forms/field";
import { ResourcePage } from "@/components/resource-page";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import { formatDateTime, ROLE_LABELS } from "@/lib/format";

const ROLE_OPTIONS = ["ADMIN", "REGISTRAR", "RESULTS_OFFICER", "LECTURER"].map((value) => ({ value, label: ROLE_LABELS[value] }));

const FIELDS = [
  { name: "title", label: "Title", hint: "e.g. Dr., Mrs." },
  { name: "staff_id", label: "Staff ID" },
  { name: "first_name", label: "First name", required: true },
  { name: "last_name", label: "Surname", required: true },
  { name: "email", label: "Email", required: true, inputType: "email" },
  { name: "phone", label: "Telephone" },
  { name: "role", label: "Role", type: "select", options: ROLE_OPTIONS, required: true, default: "LECTURER", span: 2 },
  { name: "can_approve_results", label: "Can approve results", type: "checkbox", hint: "Review, return and approve submitted result sheets" },
  { name: "can_publish_results", label: "Can publish results", type: "checkbox", hint: "Release approved results to students" },
  { name: "can_request_amendments", label: "Can request amendments", type: "checkbox", hint: "Propose changes to published results" },
  { name: "can_approve_amendments", label: "Can approve amendments", type: "checkbox", hint: "Apply changes to published results" },
  { name: "password", label: "Temporary password", inputType: "password", hint: "Required for new accounts. The user must change it at first sign-in.", span: 2 },
];

const COLUMNS = [
  {
    key: "name",
    header: "Name",
    sortKey: "last_name",
    cell: (r) => (
      <>
        <span className="font-medium">{r.full_name}</span>
        <span className="block text-xs text-muted-foreground">{r.email}</span>
      </>
    ),
  },
  { key: "role_display", header: "Role" },
  {
    key: "caps",
    header: "Result permissions",
    cell: (r) =>
      [r.can_approve_results && "Approve", r.can_publish_results && "Publish", r.can_request_amendments && "Request amendments", r.can_approve_amendments && "Approve amendments"]
        .filter(Boolean)
        .join(", ") || "—",
  },
  { key: "last_login", header: "Last sign-in", sortKey: "last_login", cell: (r) => formatDateTime(r.last_login) },
  { key: "is_active", header: "Status", cell: (r) => <StatusBadge status={r.is_active ? "ACTIVE" : "SUSPENDED"} label={r.is_active ? "Active" : "Disabled"} /> },
];

function withoutBlankPassword(payload) {
  const { password, ...rest } = payload;
  return password ? payload : rest;
}

export default function UsersPage() {
  const [toggling, setToggling] = useState(null);
  const [passwordFor, setPasswordFor] = useState(null);
  const [refreshPage, setRefreshPage] = useState(0);

  return (
    <>
      <ResourcePage
        key={refreshPage}
        title="Staff accounts"
        description="Create staff accounts, assign roles and grant result permissions. Student accounts are created from student records."
        endpoint="/users/"
        columns={COLUMNS}
        fields={FIELDS}
        transform={withoutBlankPassword}
        singular="staff account"
        readRoles={["ADMIN"]}
        writeRoles={["ADMIN"]}
        allowDelete={false}
        filters={[
          { key: "role", label: "Role", options: ROLE_OPTIONS },
          { key: "is_active", label: "Status", options: [{ value: "true", label: "Active" }, { value: "false", label: "Disabled" }] },
        ]}
        searchPlaceholder="Search name, email or staff ID…"
        headerActions={
          <Button variant="outline" asChild>
            <Link href="/settings/users/import">
              <Upload /> Import staff
            </Link>
          </Button>
        }
        rowActions={(row) => (
          <>
            <DropdownMenuItem onSelect={() => setPasswordFor(row)}>
              <KeyRound /> Set temporary password
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setToggling(row)}>
              <Power /> {row.is_active ? "Disable account" : "Enable account"}
            </DropdownMenuItem>
          </>
        )}
      />
      <ConfirmDialog
        open={toggling !== null}
        onOpenChange={(open) => !open && setToggling(null)}
        title={toggling?.is_active ? `Disable ${toggling?.full_name}?` : `Enable ${toggling?.full_name}?`}
        description={toggling?.is_active ? "They will be signed out of new requests and unable to sign in." : "They will be able to sign in again."}
        confirmLabel={toggling?.is_active ? "Disable" : "Enable"}
        destructive={toggling?.is_active}
        requireReason
        reasonOptional
        onConfirm={async (reason) => {
          try {
            await api.post(`/users/${toggling.id}/${toggling.is_active ? "deactivate" : "activate"}/`, { reason });
            toast.success("Account updated.");
            setRefreshPage((n) => n + 1);
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
      {passwordFor && <SetPasswordDialog user={passwordFor} onClose={() => setPasswordFor(null)} />}
    </>
  );
}

function SetPasswordDialog({ user, onClose }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function save() {
    setPending(true);
    setError("");
    try {
      await api.post(`/users/${user.id}/set-password/`, { new_password: password });
      toast.success("Temporary password set. Share it with the user through a secure channel.");
      onClose();
    } catch (e) {
      setError(fieldErrors(e).new_password || errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set a temporary password</DialogTitle>
          <DialogDescription>{user.full_name} will be asked to choose a new password after signing in.</DialogDescription>
        </DialogHeader>
        <Field id="temp-password" label="Temporary password" error={error}>
          <Input id="temp-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending || password.length < 10}>
            {pending && <Loader2 className="animate-spin" />}
            Set password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
