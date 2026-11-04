"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Banknote, CalendarCheck, Download, FileUp, Loader2, RefreshCw, Wallet } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, RoleGate, StatCard, StatusBadge } from "@/components/common";
import { ExportMenu } from "@/components/export-menu";
import { Field } from "@/components/forms/field";
import { DataTable } from "@/components/tables/data-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";
import { api, downloadFile, errorMessage, fieldErrors } from "@/lib/api";
import { formatDateTime, formatMoney } from "@/lib/format";

const STATUS_COLOUR = { SUCCESS: "PUBLISHED", PENDING: "PENDING", FAILED: "REJECTED", ABANDONED: "CLOSED", MISMATCH: "REJECTED", REVERSED: "CANCELLED" };
const METHOD = { mobile_money: "Mobile money", card: "Card", bank: "Bank", bank_transfer: "Bank transfer", cash: "Cash", cheque: "Cheque" };

export default function PaymentsPage() {
  const params = useSearchParams();
  const { data: summary, reload: reloadSummary } = useApi("/payments/summary/");
  const [importing, setImporting] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [checking, setChecking] = useState(null);
  const [exportParams, setExportParams] = useState({});
  const changed = () => {
    setRefresh((n) => n + 1);
    reloadSummary();
  };
  const initialStatus = params.get("status");

  async function check(row) {
    setChecking(row.id);
    try {
      const { data } = await api.post(`/payments/${row.id}/verify/`);
      toast[data.status === "SUCCESS" ? "success" : "info"](`${row.reference}: ${data.status_display}.`);
      changed();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setChecking(null);
    }
  }

  const columns = [
    { key: "created_at", header: "Date", cell: (r) => <span className="text-xs">{formatDateTime(r.paid_at || r.created_at)}</span> },
    {
      key: "student",
      header: "Student",
      cell: (r) => (
        <span>
          <span className="block font-medium">{r.student_number}</span>
          <span className="text-xs text-muted-foreground">{r.student_name}</span>
        </span>
      ),
    },
    { key: "amount", header: "School fees", className: "text-right", cell: (r) => <span className="tabular-nums">{formatMoney(r.amount)}</span> },
    { key: "fee", header: "Fee", className: "text-right", cell: (r) => <span className="tabular-nums text-muted-foreground">{Number(r.fee) ? formatMoney(r.fee) : "—"}</span> },
    {
      key: "source",
      header: "Method",
      cell: (r) => (
        <span className="text-xs">
          {r.source === "ONLINE" ? "Online" : "Recorded"}
          {r.channel ? ` · ${METHOD[r.channel] || r.channel}` : ""}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <span>
          <StatusBadge status={STATUS_COLOUR[r.status]} label={r.status_display} />
          {r.reversal_reason && <span className="mt-0.5 block max-w-48 whitespace-normal text-xs text-muted-foreground">{r.reversal_reason}</span>}
        </span>
      ),
    },
    { key: "receipt_number", header: "Receipt / reference", cell: (r) => <span className="text-xs">{r.receipt_number || r.reference}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "text-right",
      cell: (r) =>
        r.status === "SUCCESS" || r.status === "REVERSED" ? (
          <Button size="sm" variant="outline" onClick={() => downloadFile(`/payments/${r.id}/receipt/`, {}, `receipt-${r.receipt_number}.pdf`).catch((e) => toast.error(errorMessage(e)))}>
            <Download /> {r.status === "REVERSED" ? "Cancelled receipt" : "Receipt"}
          </Button>
        ) : r.status === "PENDING" && r.source === "ONLINE" ? (
          <Button size="sm" variant="outline" disabled={checking === r.id} onClick={() => check(r)}>
            {checking === r.id ? <Loader2 className="animate-spin" /> : <RefreshCw />} Check status
          </Button>
        ) : null,
    },
  ];

  return (
    <RoleGate roles={["ADMIN", "ACCOUNTS_OFFICER"]}>
      <PageHeader
        title="Payments"
        description="Payments made online by students and payments recorded by the Accounts Office."
        actions={
          <>
            <ExportMenu url="/payments/export/" params={exportParams} filename="payments"
                        label={Object.keys(exportParams).length ? "Export filtered" : "Export"} />
            <Button variant="outline" onClick={() => setImporting(true)}>
              <FileUp /> Import bank statement
            </Button>
          </>
        }
      />
      {summary && !summary.online_enabled && (
        <Alert variant="warning" className="mb-4">
          <AlertTitle>Online payment is off</AlertTitle>
          <AlertDescription>
            {summary.gateway_configured
              ? "An administrator can turn on “Students can pay online” in Institution settings."
              : "Online payment has not been set up on the server yet; ask your system administrator. Recorded payments work without it."}
          </AlertDescription>
        </Alert>
      )}
      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard label="Collected today" value={formatMoney(summary.collected_today)} hint={`${summary.payments_today} payments`} icon={CalendarCheck} tone="green" />
          <StatCard label="Collected in total" value={formatMoney(summary.collected)} hint={`of ${formatMoney(summary.billed)} billed`} icon={Banknote} tone="brand" />
          <StatCard label="Outstanding" value={formatMoney(summary.outstanding)} hint={`${summary.students_owing} students owing`} icon={Wallet} tone="amber" />
          <StatCard label="Need attention" value={summary.needs_attention} hint="Mismatched, or pending over 30 min" icon={AlertTriangle} tone={summary.needs_attention ? "red" : "green"} />
        </div>
      )}
      <DataTable
        endpoint="/payments/"
        columns={columns}
        searchPlaceholder="Search receipt, reference, student…"
        refreshKey={refresh}
        pageSize={50}
        onData={(_, query) => {
          // The export downloads exactly what the filters and search show, every page of it.
          const rest = { ...query };
          delete rest.page;
          delete rest.page_size;
          setExportParams(rest);
        }}
        filters={[
          {
            key: "status",
            label: "Status",
            defaultValue: initialStatus || undefined,
            options: [
              { value: "SUCCESS", label: "Successful" }, { value: "PENDING", label: "Pending" }, { value: "MISMATCH", label: "Needs attention" },
              { value: "FAILED", label: "Failed" }, { value: "ABANDONED", label: "Not completed" }, { value: "REVERSED", label: "Reversed" },
            ],
          },
          { key: "date_from", label: "Paid from", type: "date" },
          { key: "date_to", label: "to", type: "date" },
          { key: "source", label: "Source", options: [{ value: "ONLINE", label: "Online" }, { value: "MANUAL", label: "Recorded" }] },
        ]}
        emptyTitle="No payments yet"
      />
      {importing && <ImportDialog onClose={() => setImporting(false)} onDone={changed} />}
    </RoleGate>
  );
}

const ROW_STATUS = {
  new: { label: "New", badge: "PUBLISHED" },
  possible_duplicate: { label: "Possible duplicate", badge: "PENDING" },
  recorded: { label: "Already recorded", badge: "CLOSED" },
  repeated: { label: "Repeated in file", badge: "CLOSED" },
  unknown: { label: "Student not found", badge: "REJECTED" },
  invalid: { label: "Needs fixing", badge: "REJECTED" },
};
const RECORDABLE = ["new", "possible_duplicate"];
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Bank statement import: preview every row, untick anything doubtful, then record. */
function ImportDialog({ onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState(null);
  const [chosen, setChosen] = useState(new Set());
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function check() {
    setPending(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/payments/import/preview/", form);
      setPreview(data);
      // New rows are ticked; possible duplicates wait for someone to look at them.
      setChosen(new Set(data.rows.filter((r) => r.status === "new").map((r) => r.row)));
    } catch (e) {
      setError(fieldErrors(e).file || errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  async function record() {
    setPending(true);
    setError("");
    try {
      const rows = preview.rows.filter((r) => chosen.has(r.row));
      const { data } = await api.post("/payments/import/confirm/", { rows });
      setResult(data);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }

  const toggle = (row) => setChosen((prev) => {
    const next = new Set(prev);
    if (next.has(row)) next.delete(row);
    else next.add(row);
    return next;
  });
  const total = preview?.rows.filter((r) => chosen.has(r.row)).reduce((sum, r) => sum + Number(r.amount), 0) ?? 0;
  const doubtful = preview?.counts.possible_duplicate ?? 0;

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import a bank statement</DialogTitle>
          <DialogDescription>
            {preview
              ? "Check the rows below. Nothing is recorded until you confirm."
              : <>A CSV or Excel file with <code>student_number</code>, <code>amount</code> and <code>reference</code> columns, and optionally <code>date</code> (YYYY-MM-DD), <code>method</code> and <code>note</code>.</>}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {result ? (
          <div className="space-y-3">
            <Alert variant="success">
              <AlertTitle>{plural(result.recorded, "payment")} recorded</AlertTitle>
              {result.skipped.length > 0 && (
                <AlertDescription>{plural(result.skipped.length, "row")} not recorded (already recorded, not found or needing fixes).</AlertDescription>
              )}
            </Alert>
            {result.in_credit.length > 0 && (
              <Alert variant="warning">
                <AlertTitle>{plural(result.in_credit.length, "student")} now in credit</AlertTitle>
                <AlertDescription>
                  <p>They have paid more than they owe. Refund them, or leave the credit for their next bill.</p>
                  <ul className="mt-1 space-y-0.5">
                    {result.in_credit.slice(0, 10).map((s) => (
                      <li key={s.student}>
                        <a href={`/finance/accounts/${s.student}`}>{s.student_number} {s.full_name}</a>: {formatMoney(s.credit)} credit
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : preview ? (
          <div className="space-y-3">
            {doubtful > 0 && (
              <Alert variant="warning">
                <AlertTitle>{plural(doubtful, "possible duplicate")} left unticked</AlertTitle>
                <AlertDescription>
                  The student already has a payment of the same amount within a few days under another reference. Tick a row
                  only if it really is a second payment.
                </AlertDescription>
              </Alert>
            )}
            <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border text-sm">
              {preview.rows.map((r) => {
                const recordable = RECORDABLE.includes(r.status);
                return (
                  <li key={r.row} className="flex items-start gap-3 px-3 py-2.5">
                    <Checkbox
                      className="mt-0.5"
                      checked={chosen.has(r.row)}
                      disabled={!recordable || pending}
                      onCheckedChange={() => toggle(r.row)}
                      aria-label={`Record row ${r.row}: ${r.student_number} ${r.reference}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {r.full_name || r.student_number || "No student number"}
                        <span className="ml-2 font-normal text-muted-foreground">{r.student_number}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Row {r.row} · {r.reference || "no reference"}{r.date ? ` · ${r.date}` : ""}
                      </p>
                      {r.message && <p className="mt-0.5 text-xs">{r.message}</p>}
                    </div>
                    <div className="shrink-0 space-y-1 text-right">
                      <p className="tabular-nums">{Number.isNaN(Number(r.amount)) ? r.amount : formatMoney(r.amount)}</p>
                      <StatusBadge status={ROW_STATUS[r.status].badge} label={ROW_STATUS[r.status].label} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="space-y-3">
            <Field id="payments-file" label="File">
              {(aria) => <Input type="file" accept=".csv,.xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} {...aria} />}
            </Field>
            <Button variant="link" size="sm" className="h-auto p-0" asChild>
              <a href="/api/v1/payments/import-template/" download>
                <Download /> Download a template
              </a>
            </Button>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>{result ? "Close" : "Cancel"}</Button>
          {!result && !preview && (
            <Button onClick={check} disabled={pending || !file}>
              {pending && <Loader2 className="animate-spin" />}
              Check file
            </Button>
          )}
          {!result && preview && (
            <Button onClick={record} disabled={pending || chosen.size === 0}>
              {pending && <Loader2 className="animate-spin" />}
              Record {plural(chosen.size, "payment")} ({formatMoney(total)})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
