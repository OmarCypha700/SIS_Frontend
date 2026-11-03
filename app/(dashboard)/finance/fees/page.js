"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, Pencil, Plus, Receipt, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog, PageHeader, RoleGate } from "@/components/common";
import { Field, NativeSelect } from "@/components/forms/field";
import { DataTable } from "@/components/tables/data-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage, fieldErrors } from "@/lib/api";
import { formatMoney } from "@/lib/format";

/** Lookups that may come back paginated or as a plain array. */
async function list(url, params = {}) {
  const { data } = await api.get(url, { params: { page_size: 200, ...params } });
  return Array.isArray(data) ? data : data.results ?? [];
}

function useLookups() {
  const [lookups, setLookups] = useState({ programmes: [], levels: [], years: [], semesters: [] });
  useEffect(() => {
    Promise.all([list("/programmes/"), list("/levels/"), list("/academic-years/"), list("/semesters/")])
      .then(([programmes, levels, years, semesters]) => setLookups({ programmes, levels, years, semesters }))
      .catch(() => toast.error("Could not load programmes and periods."));
  }, []);
  return lookups;
}

export default function FeeSchedulesPage() {
  const { data: summary } = useApi("/payments/summary/");
  const perYear = summary?.billing_period === "ACADEMIC_YEAR";
  const lookups = useLookups();
  const [editing, setEditing] = useState(null);
  const [billing, setBilling] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [copying, setCopying] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const changed = () => setRefresh((n) => n + 1);

  const columns = [
    { key: "period_label", header: "Period", cell: (r) => <span className="font-medium">{r.period_label}</span> },
    { key: "programme_code", header: "Programme", cell: (r) => <span title={r.programme_name}>{r.programme_code}</span> },
    { key: "level_name", header: "Level" },
    {
      key: "items",
      header: "Items",
      className: "min-w-56 whitespace-normal",
      cell: (r) => <span className="text-xs text-muted-foreground">{r.items.map((i) => i.description).join(", ")}</span>,
    },
    { key: "total", header: "Total", className: "text-right", cell: (r) => <span className="tabular-nums">{formatMoney(r.total)}</span> },
    {
      key: "billed_students",
      header: "Billed",
      cell: (r) => (r.billed_students ? <Badge variant="secondary">{r.billed_students} students</Badge> : <Badge variant="outline">Not billed</Badge>),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" onClick={() => setBilling(r)}>
            <Send /> Bill
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label={`Edit ${r.programme_code} ${r.level_name}`} onClick={() => setEditing(r)}>
            <Pencil />
          </Button>
          {!r.billed_students && (
            <Button size="icon-sm" variant="ghost" aria-label={`Delete ${r.programme_code} ${r.level_name}`} onClick={() => setDeleting(r)}>
              <Trash2 />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <RoleGate roles={["ADMIN", "ACCOUNTS_OFFICER"]}>
      <PageHeader
        title="Fee schedules"
        description={`What each programme and level pays ${perYear ? "each academic year" : "each semester"}. Billing charges the fees to every student of that programme and level.`}
        actions={
          <>
            <Button variant="outline" onClick={() => setCopying(true)}>
              <Copy /> Copy from another year
            </Button>
            <Button onClick={() => setEditing({})}>
              <Plus /> New fee schedule
            </Button>
          </>
        }
      />
      <DataTable
        endpoint="/fee-schedules/"
        columns={columns}
        searchable={false}
        refreshKey={refresh}
        filters={[
          { key: "academic_year", label: "Academic year", endpoint: "/academic-years/" },
          { key: "programme", label: "Programme", endpoint: "/programmes/", optionLabel: (p) => p.code },
          { key: "level", label: "Level", endpoint: "/levels/" },
        ]}
        emptyTitle="No fees set up yet"
        emptyDescription="Add the fees for a programme and level, or copy last year's fees."
      />
      {editing && (
        <ScheduleDialog schedule={editing} perYear={perYear} lookups={lookups} onClose={() => setEditing(null)}
                        onSaved={() => { setEditing(null); changed(); }} />
      )}
      {billing && <BillDialog schedule={billing} onClose={() => setBilling(null)} onDone={changed} />}
      {copying && <CopyDialog years={lookups.years} onClose={() => setCopying(false)} onDone={changed} />}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete fees for ${deleting?.programme_code} ${deleting?.level_name}?`}
        description="These fees have not been billed to anyone, so nothing else changes."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            await api.delete(`/fee-schedules/${deleting.id}/`);
            toast.success("Fee schedule deleted.");
            setDeleting(null);
            changed();
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
    </RoleGate>
  );
}

function ScheduleDialog({ schedule, perYear, lookups, onClose, onSaved }) {
  const isNew = !schedule.id;
  const [form, setForm] = useState({
    programme: schedule.programme ?? "", level: schedule.level ?? "", academic_year: schedule.academic_year ?? "",
    semester: schedule.semester ?? "", notes: schedule.notes ?? "",
  });
  const [items, setItems] = useState(schedule.items?.length ? schedule.items : [{ description: "Tuition", amount: "" }]);
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const semesters = lookups.semesters.filter((s) => String(s.academic_year) === String(form.academic_year));
  const total = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  async function save() {
    setPending(true);
    setErrors({});
    const body = { ...form, semester: perYear ? null : form.semester || null, items };
    try {
      if (isNew) await api.post("/fee-schedules/", body);
      else await api.patch(`/fee-schedules/${schedule.id}/`, body);
      toast.success(isNew ? "Fee schedule added. Bill it to charge the students." : "Fee schedule saved. Bill it again to apply changes.");
      onSaved();
    } catch (e) {
      setErrors({ ...fieldErrors(e), form: errorMessage(e) });
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "New fee schedule" : `Fees for ${schedule.programme_code} ${schedule.level_name}`}</DialogTitle>
          <DialogDescription>
            {isNew ? "Choose who the fees are for, then list each item." : "Changed amounts are billed as an adjustment the next time you bill."}
          </DialogDescription>
        </DialogHeader>
        {errors.form && !Object.keys(errors).some((k) => k !== "form") && (
          <Alert variant="destructive">
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="fs-programme" label="Programme" error={errors.programme}>
            {(aria) => (
              <NativeSelect value={form.programme} onChange={set("programme")} disabled={!isNew} {...aria}>
                <option value="">Choose…</option>
                {lookups.programmes.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
              </NativeSelect>
            )}
          </Field>
          <Field id="fs-level" label="Level" error={errors.level}>
            {(aria) => (
              <NativeSelect value={form.level} onChange={set("level")} disabled={!isNew} {...aria}>
                <option value="">Choose…</option>
                {lookups.levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </NativeSelect>
            )}
          </Field>
          <Field id="fs-year" label="Academic year" error={errors.academic_year}>
            {(aria) => (
              <NativeSelect value={form.academic_year} onChange={(e) => setForm((f) => ({ ...f, academic_year: e.target.value, semester: "" }))}
                            disabled={!isNew} {...aria}>
                <option value="">Choose…</option>
                {lookups.years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </NativeSelect>
            )}
          </Field>
          {!perYear && (
            <Field id="fs-semester" label="Semester" error={errors.semester}>
              {(aria) => (
                <NativeSelect value={form.semester} onChange={set("semester")} disabled={!isNew || !form.academic_year} {...aria}>
                  <option value="">Choose…</option>
                  {semesters.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </NativeSelect>
              )}
            </Field>
          )}
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Fee items</legend>
          {items.map((item, index) => (
            <div key={item.id ?? `new-${index}`} className="grid grid-cols-[1fr_8rem_2.25rem] items-center gap-2">
              <Input aria-label={`Item ${index + 1} description`} placeholder="e.g. Tuition" value={item.description}
                     onChange={(e) => setItems((all) => all.map((it, i) => (i === index ? { ...it, description: e.target.value } : it)))} />
              <Input aria-label={`Item ${index + 1} amount`} type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00"
                     value={item.amount}
                     onChange={(e) => setItems((all) => all.map((it, i) => (i === index ? { ...it, amount: e.target.value } : it)))} />
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove item ${index + 1}`} disabled={items.length === 1}
                      onClick={() => setItems((all) => all.filter((_, i) => i !== index))}>
                <Trash2 />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setItems((all) => [...all, { description: "", amount: "" }])}>
              <Plus /> Add item
            </Button>
            <span className="text-sm font-medium tabular-nums">Total {formatMoney(total)}</span>
          </div>
          {errors.items && <p className="text-sm text-destructive">{typeof errors.items === "string" ? errors.items : "Check each item has a description and an amount."}</p>}
        </fieldset>
        {errors.form && Object.keys(errors).some((k) => k !== "form") && <p className="text-sm text-destructive">{errors.form}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button onClick={save} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const OUTCOME = { new: "New bill", updated: "Amount changed", unchanged: "Already billed" };

function BillDialog({ schedule, onClose, onDone }) {
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);

  useEffect(() => {
    api.post(`/fee-schedules/${schedule.id}/bill/`, { dry_run: true })
      .then(({ data }) => setPreview(data))
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setPending(false));
  }, [schedule.id]);

  async function confirm() {
    setPending(true);
    try {
      const { data } = await api.post(`/fee-schedules/${schedule.id}/bill/`, { dry_run: false });
      setResult(data);
      toast.success(`Billed ${data.changed} student${data.changed === 1 ? "" : "s"}.`);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  const shown = result || preview;
  const changing = shown?.rows.filter((r) => r.outcome !== "unchanged") ?? [];
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Bill {schedule.programme_code} {schedule.level_name} · {schedule.period_label}</DialogTitle>
          <DialogDescription>
            {formatMoney(schedule.total)} per student. Students already billed are not charged twice.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {pending && !shown && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Preparing a preview…</p>}
        {shown && (
          <div className="space-y-3">
            <Alert variant={result ? "success" : "info"}>
              <Receipt />
              <AlertTitle>
                {result ? "Billed" : "Preview"}: {changing.length} of {shown.students} student{shown.students === 1 ? "" : "s"},{" "}
                {formatMoney(shown.total)}
              </AlertTitle>
              <AlertDescription>
                {changing.length === 0 ? "Everyone in this class has already been billed these fees." : result ? "Students who have now paid enough are cleared automatically." : "Nothing has been saved yet."}
              </AlertDescription>
            </Alert>
            {changing.length > 0 && (
              <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border text-sm">
                {changing.slice(0, 200).map((r) => (
                  <li key={r.student} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate">{r.full_name}</span>
                      <span className="text-xs text-muted-foreground">{r.student_number} · {OUTCOME[r.outcome]}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">{formatMoney(r.adding)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>{result ? "Close" : "Cancel"}</Button>
          {!result && (
            <Button onClick={confirm} disabled={pending || !preview || changing.length === 0}>
              {pending && preview && <Loader2 className="animate-spin" />}
              Bill {changing.length} student{changing.length === 1 ? "" : "s"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CopyDialog({ years, onClose, onDone }) {
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function copy() {
    setPending(true);
    setError("");
    try {
      const { data } = await api.post("/fee-schedules/copy/", { source_year: source, target_year: target });
      toast.success(data.created ? `Copied ${data.created} fee schedule${data.created === 1 ? "" : "s"}. Check the amounts, then bill.` : "Nothing new to copy.");
      onDone();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy fees from another year</DialogTitle>
          <DialogDescription>Fees already set up for the new year are left as they are. Nothing is billed.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="copy-from" label="From" error={error}>
            {(aria) => (
              <NativeSelect value={source} onChange={(e) => setSource(e.target.value)} {...aria}>
                <option value="">Choose…</option>
                {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </NativeSelect>
            )}
          </Field>
          <Field id="copy-to" label="To">
            {(aria) => (
              <NativeSelect value={target} onChange={(e) => setTarget(e.target.value)} {...aria}>
                <option value="">Choose…</option>
                {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
              </NativeSelect>
            )}
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button onClick={copy} disabled={pending || !source || !target}>
            {pending && <Loader2 className="animate-spin" />}
            Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
