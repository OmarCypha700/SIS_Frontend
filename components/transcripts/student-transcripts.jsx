"use client";

import { useState } from "react";
import { FileBadge, Info } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { StatusBadge } from "@/components/common";
import { IssueTranscriptDialog } from "@/components/transcripts/issue-transcript-dialog";
import { TranscriptActions } from "@/components/transcripts/transcript-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { formatDate } from "@/lib/format";

/** Official transcripts for one student, on the Academic record tab. */
export function StudentTranscripts({ studentId }) {
  const { user } = useAuth();
  const canIssue = Boolean(user.capabilities?.can_issue_transcripts);
  const [issuing, setIssuing] = useState(false);
  const { data, reload } = useApi("/transcripts/", { student: studentId, page_size: 50 });
  const rows = data?.results ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <FileBadge className="size-5" /> Official transcripts
          </CardTitle>
          <CardDescription>
            Numbered transcripts with a verification code, recorded in the transcript register.
          </CardDescription>
        </div>
        {canIssue && <Button onClick={() => setIssuing(true)}>Issue official transcript</Button>}
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="flex items-center gap-2 px-6 text-sm text-muted-foreground">
            <Info className="size-4" />
            {canIssue ? "None issued yet." : "None issued yet. Ask an administrator if you need to issue one."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Serial</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Copies</TableHead>
                  <TableHead className="w-12 pr-6" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="pl-6 font-medium">
                      {t.serial}
                      {t.is_interim && (
                        <Badge variant="outline" className="ml-2">
                          Interim
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(t.issued_at)}
                      <span className="block text-xs text-muted-foreground">{t.issued_by_name}</span>
                    </TableCell>
                    <TableCell className="max-w-64 truncate" title={t.purpose}>
                      {t.purpose}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                      {t.revoke_reason && <span className="block text-xs text-muted-foreground">{t.revoke_reason}</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{t.print_count}</TableCell>
                    <TableCell className="pr-6 text-right">
                      {canIssue && <TranscriptActions transcript={t} onChanged={reload} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {issuing && <IssueTranscriptDialog studentId={studentId} onClose={() => setIssuing(false)} onIssued={reload} />}
    </Card>
  );
}
