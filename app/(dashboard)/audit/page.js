"use client";

import { useState } from "react";

import { PageHeader, RoleGate } from "@/components/common";
import { DataTable } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";

const ACTION_OPTIONS = ["auth.", "user.", "student.", "registration.", "results.", "marks.", "assessment.", "institution.", "semester.", "course"].map(
  (value) => ({ value, label: value.replace(/\.$/, "") }),
);

export default function AuditLogPage() {
  const [selected, setSelected] = useState(null);
  const columns = [
    { key: "created_at", header: "When", sortKey: "created_at", cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.created_at)}</span> },
    { key: "actor", header: "Who", cell: (r) => r.actor_email || "System" },
    { key: "action", header: "Action", cell: (r) => <code className="text-xs">{r.action}</code> },
    { key: "summary", header: "Summary", className: "max-w-96", cell: (r) => <span className="line-clamp-2">{r.summary}</span> },
    {
      key: "details",
      header: <span className="sr-only">Details</span>,
      className: "text-right",
      cell: (r) => (
        <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
          Details
        </Button>
      ),
    },
  ];
  return (
    <RoleGate roles={["ADMIN", "REGISTRAR", "RESULTS_OFFICER"]}>
      <PageHeader title="Audit log" description="Read-only record of sensitive actions. Entries cannot be edited or deleted through the application." />
      <DataTable
        endpoint="/audit-logs/"
        columns={columns}
        defaultOrdering="-created_at"
        searchPlaceholder="Search summary, user or record id…"
        filters={[{ key: "action", label: "Area", options: ACTION_OPTIONS }]}
        pageSize={50}
      />
      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.action}</DialogTitle>
            <DialogDescription>
              {selected && `${formatDateTime(selected.created_at)} · ${selected.actor_email || "System"} · ${selected.entity_type} #${selected.entity_id}`}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <p>{selected.summary}</p>
              {selected.reason && (
                <p>
                  <span className="font-medium">Reason:</span> {selected.reason}
                </p>
              )}
              {[["Before", selected.before], ["After", selected.after], ["Details", selected.metadata]].map(
                ([label, value]) =>
                  value && Object.keys(value).length > 0 && (
                    <div key={label}>
                      <p className="mb-1 font-medium">{label}</p>
                      <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(value, null, 2)}</pre>
                    </div>
                  ),
              )}
              <p className="text-xs text-muted-foreground">
                Request {selected.request_id || "—"} · IP {selected.ip_address || "—"}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </RoleGate>
  );
}
