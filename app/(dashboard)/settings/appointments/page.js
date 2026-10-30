"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, CalendarX, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, RoleGate, StatusBadge } from "@/components/common";
import { Field, NativeSelect } from "@/components/forms/field";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import { formatDate } from "@/lib/format";

const OFFICES = [
  { value: "REGISTRAR", label: "Registrar" },
  { value: "RESULTS_OFFICER", label: "Results Officer" },
];

const STATE_BADGES = {
  current: { status: "ACTIVE", label: "In office" },
  upcoming: { status: "PENDING", label: "Starts later" },
  completed: { status: "COMPLETED", label: "Term completed" },
  ended: { status: "SUSPENDED", label: "Ended" },
};

function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function AppointmentsPage() {
  const params = useSearchParams();
  const userFilter = params.get("user");
  const [creating, setCreating] = useState(false);
  const [ending, setEnding] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const reload = () => setRefresh((n) => n + 1);

  const columns = [
    {
      key: "user",
      header: "Person",
      cell: (r) => (
        <>
          <span className="font-medium">{r.user_name}</span>
          <span className="block text-xs text-muted-foreground">{r.user_role_display} · {r.user_email}</span>
        </>
      ),
    },
    { key: "title", header: "Office", cell: (r) => <span className="font-medium">{r.title}</span> },
    {
      key: "period",
      header: "Period",
      sortKey: "starts_on",
      cell: (r) => (
        <span className="whitespace-nowrap">
          {formatDate(r.starts_on)} – {r.ends_on ? formatDate(r.ends_on) : "open-ended"}
        </span>
      ),
    },
    {
      key: "state",
      header: "Status",
      cell: (r) => <StatusBadge status={STATE_BADGES[r.state]?.status} label={STATE_BADGES[r.state]?.label} />,
    },
    {
      key: "record",
      header: "Record",
      className: "max-w-72",
      cell: (r) => (
        <span className="line-clamp-3 text-xs text-muted-foreground">
          {[r.reference && `Ref. ${r.reference}`, r.appointed_by_name && `Appointed by ${r.appointed_by_name}`,
            r.end_reason && `Ended by ${r.ended_by_name || "—"}: ${r.end_reason}`].filter(Boolean).join(" · ") || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (r) =>
        (r.state === "current" || r.state === "upcoming") && (
          <Button size="sm" variant="outline" onClick={() => setEnding(r)}>
            <CalendarX /> End
          </Button>
        ),
    },
  ];

  return (
    <RoleGate roles={["ADMIN"]}>
      <PageHeader
        title="Appointments"
        description="Who holds which office, and when. A person keeps their own role and teaching; an office adds its access only while the appointment lasts. Ended appointments stay here as the record."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> New appointment
          </Button>
        }
      />
      <DataTable
        endpoint="/appointments/"
        columns={columns}
        params={userFilter ? { user: userFilter } : {}}
        defaultOrdering="-starts_on"
        refreshKey={refresh}
        searchPlaceholder="Search name, email or reference…"
        filters={[
          { key: "office", label: "Office", options: OFFICES },
          { key: "current", label: "Status", options: [{ value: "true", label: "In office now" }, { value: "false", label: "Not in office" }] },
        ]}
        emptyTitle="No appointments recorded"
        emptyDescription="Record an appointment when a staff member takes up an office such as Registrar or Results Officer."
      />
      {creating && (
        <AppointDialog
          initialUser={userFilter}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
      {ending && (
        <EndDialog
          appointment={ending}
          onClose={() => setEnding(null)}
          onEnded={() => {
            setEnding(null);
            reload();
          }}
        />
      )}
    </RoleGate>
  );
}

function AppointDialog({ initialUser, onClose, onSaved }) {
  const { data: staff } = useApi("/users/", { page_size: 200, is_active: "true", ordering: "last_name" });
  const [form, setForm] = useState({
    user: initialUser || "", office: "REGISTRAR", acting: false, starts_on: today(), ends_on: "", reference: "", notes: "",
  });
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target ? e.target.value : e }));

  async function save() {
    setPending(true);
    setErrors({});
    try {
      await api.post("/appointments/", { ...form, user: Number(form.user), ends_on: form.ends_on || null });
      toast.success("Appointment recorded. The office's access applies from the start date.");
      onSaved();
    } catch (e) {
      const fields = fieldErrors(e);
      setErrors(Object.keys(fields).length ? fields : { form: errorMessage(e) });
    } finally {
      setPending(false);
    }
  }

  const people = (staff?.results || []).filter((u) => u.role !== "ADMIN" || u.id === Number(form.user));
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BadgeCheck className="size-4" /> New appointment
          </DialogTitle>
          <DialogDescription>
            The person keeps their own account, role and courses. To hand an office over, end the current holder&apos;s
            appointment and record the new one.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="appt-user" label="Staff member" required error={errors.user} className="sm:col-span-2">
            <NativeSelect id="appt-user" value={form.user} onChange={set("user")}>
              <option value="">Choose a person…</option>
              {people.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.role_display})
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="appt-office" label="Office" required error={errors.office}>
            <NativeSelect id="appt-office" value={form.office} onChange={set("office")}>
              {OFFICES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="flex items-end gap-2 pb-1.5">
            <Checkbox id="appt-acting" checked={form.acting} onCheckedChange={(v) => setForm((f) => ({ ...f, acting: v === true }))} />
            <Label htmlFor="appt-acting">Acting (covering for the holder)</Label>
          </div>
          <Field id="appt-start" label="Starts on" required error={errors.starts_on}>
            <Input id="appt-start" type="date" value={form.starts_on} onChange={set("starts_on")} />
          </Field>
          <Field id="appt-end" label="Last day" hint="Leave empty if open-ended." error={errors.ends_on}>
            <Input id="appt-end" type="date" value={form.ends_on} onChange={set("ends_on")} />
          </Field>
          <Field id="appt-ref" label="Reference" hint="e.g. appointment letter number" error={errors.reference} className="sm:col-span-2">
            <Input id="appt-ref" value={form.reference} onChange={set("reference")} maxLength={120} />
          </Field>
          <Field id="appt-notes" label="Notes" error={errors.notes} className="sm:col-span-2">
            <Textarea id="appt-notes" value={form.notes} onChange={set("notes")} rows={2} />
          </Field>
        </div>
        {(errors.form || errors.non_field_errors) && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {errors.form || errors.non_field_errors}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending || !form.user || !form.starts_on}>
            {pending && <Loader2 className="animate-spin" />}
            Record appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EndDialog({ appointment, onClose, onEnded }) {
  const [reason, setReason] = useState("");
  const [deactivate, setDeactivate] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function end() {
    setPending(true);
    setError("");
    try {
      await api.post(`/appointments/${appointment.id}/end/`, { reason, deactivate_account: deactivate });
      toast.success(`${appointment.user_name} no longer holds the office of ${appointment.office_display}.`);
      onEnded();
    } catch (e) {
      setError(fieldErrors(e).reason || errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            End {appointment.user_name}&apos;s appointment as {appointment.title}?
          </DialogTitle>
          <DialogDescription>
            The office&apos;s access stops on their next request. Their own role and courses stay, and everything they did in
            office stays recorded under their name.
          </DialogDescription>
        </DialogHeader>
        <Field id="end-reason" label="Reason" required error={error}>
          <Textarea id="end-reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                    placeholder="e.g. End of term; reshuffle; relieved of post pending an inquiry" />
        </Field>
        <div className="flex items-start gap-2">
          <Checkbox id="end-deactivate" checked={deactivate} onCheckedChange={(v) => setDeactivate(v === true)} />
          <Label htmlFor="end-deactivate" className="font-normal leading-snug">
            Also disable their account (for example during an investigation). It can be enabled again later.
          </Label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={end} disabled={pending || !reason.trim()}>
            {pending && <Loader2 className="animate-spin" />}
            End appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
