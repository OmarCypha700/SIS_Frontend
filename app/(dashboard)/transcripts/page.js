"use client";

import Link from "next/link";
import { useState } from "react";
import { FileBadge, Search } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { PageHeader, RoleGate, StatusBadge } from "@/components/common";
import { ExportMenu } from "@/components/export-menu";
import { DataTable } from "@/components/tables/data-table";
import { IssueTranscriptDialog } from "@/components/transcripts/issue-transcript-dialog";
import { TranscriptActions } from "@/components/transcripts/transcript-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useApi, useDebounced } from "@/hooks/use-api";
import { formatDateTime } from "@/lib/format";

export default function TranscriptRegisterPage() {
  const { user } = useAuth();
  const canIssue = Boolean(user.capabilities?.can_issue_transcripts);
  const [refresh, setRefresh] = useState(0);
  const [picking, setPicking] = useState(false);
  const [studentId, setStudentId] = useState(null);
  const [query, setQuery] = useState({});
  const reload = () => setRefresh((n) => n + 1);

  const columns = [
    {
      key: "serial",
      header: "Serial",
      sortKey: "serial",
      cell: (t) => (
        <>
          <span className="font-medium">{t.serial}</span>
          {t.is_interim && (
            <Badge variant="outline" className="ml-2">
              Interim
            </Badge>
          )}
          <span className="block text-xs text-muted-foreground">Code {t.verification_code}</span>
        </>
      ),
    },
    {
      key: "student",
      header: "Student",
      cell: (t) => (
        <Link href={`/students/${t.student}`} className="hover:underline">
          {t.student_name}
          <span className="block text-xs text-muted-foreground">
            {t.student_number} · {t.programme_code}
          </span>
        </Link>
      ),
    },
    { key: "purpose", header: "Purpose", cell: (t) => <span className="line-clamp-2 max-w-72">{t.purpose}</span> },
    { key: "cgpa", header: "CGPA", className: "text-right tabular-nums", cell: (t) => t.cgpa ?? "—" },
    {
      key: "issued_at",
      header: "Issued",
      sortKey: "issued_at",
      cell: (t) => (
        <span className="whitespace-nowrap">
          {formatDateTime(t.issued_at)}
          <span className="block text-xs text-muted-foreground">{t.issued_by_name}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (t) => (
        <>
          <StatusBadge status={t.status} />
          <span className="block text-xs text-muted-foreground">
            {t.status === "REVOKED" ? t.revoke_reason : `${t.print_count} cop${t.print_count === 1 ? "y" : "ies"} printed`}
          </span>
        </>
      ),
    },
    ...(canIssue
      ? [{ key: "_actions", header: <span className="sr-only">Actions</span>, className: "w-12 text-right",
           cell: (t) => <TranscriptActions transcript={t} onChanged={reload} /> }]
      : []),
  ];

  const { page, page_size, ...exportParams } = query;
  return (
    <RoleGate roles={["ADMIN", "REGISTRAR"]}>
      <PageHeader
        title="Transcripts"
        description="The register of official transcripts. Each one has a serial number and a code that anyone can check on the verification page."
        actions={
          <>
            <ExportMenu url="/transcripts/export/" params={exportParams} filename="transcript-register" />
            {canIssue && (
              <Button onClick={() => setPicking(true)}>
                <FileBadge /> Issue transcript
              </Button>
            )}
          </>
        }
      />
      {!canIssue && (
        <p className="mb-4 text-sm text-muted-foreground">
          You can view the register. Issuing, reprinting and revoking need permission from an administrator.
        </p>
      )}
      <DataTable
        endpoint="/transcripts/"
        columns={columns}
        searchPlaceholder="Serial, code, student or purpose…"
        defaultOrdering="-issued_at"
        refreshKey={refresh}
        onData={(_, params) => setQuery(params)}
        emptyTitle="No transcripts issued yet"
        filters={[{ key: "status", label: "Status", options: [{ value: "VALID", label: "Valid" }, { value: "REVOKED", label: "Revoked" }] }]}
      />
      {picking && (
        <StudentPicker
          onClose={() => setPicking(false)}
          onPick={(id) => {
            setPicking(false);
            setStudentId(id);
          }}
        />
      )}
      {studentId && <IssueTranscriptDialog studentId={studentId} onClose={() => setStudentId(null)} onIssued={reload} />}
    </RoleGate>
  );
}

function StudentPicker({ onClose, onPick }) {
  const [search, setSearch] = useState("");
  const term = useDebounced(search);
  const { data, loading } = useApi(term.length >= 2 ? "/students/" : null, { search: term, page_size: 8 });
  const rows = data?.results ?? [];
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue a transcript</DialogTitle>
          <DialogDescription>Find the student by number, name or email.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. NCHT/2025/0012 or Mensah"
            className="pl-8"
            aria-label="Find student"
          />
        </div>
        <ul className="max-h-72 divide-y overflow-y-auto rounded-md border empty:hidden">
          {rows.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/60"
                onClick={() => onPick(s.id)}
              >
                <span className="font-medium">{s.full_name}</span>
                <span className="block text-xs text-muted-foreground">
                  {s.student_number} · {s.programme_code} · {s.level_name}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {term.length >= 2 && !loading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No students match &ldquo;{term}&rdquo;.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
