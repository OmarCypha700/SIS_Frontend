"use client";

import { Download, KeyRound, Printer } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** How imported accounts get their first password. "email" only exists for staff. */
export function PasswordModeSelect({ value, onChange, allowEmail = false, allowNone = false }) {
  return (
    <div className="grid gap-1.5 text-left">
      <Label htmlFor="password-mode">First password</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="password-mode" className="w-72">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="generate">Generate temporary passwords (print slips)</SelectItem>
          <SelectItem value="column">Use the password column in the file</SelectItem>
          {allowEmail && <SelectItem value="email">Email a set-up link (uses email allowance)</SelectItem>}
          {allowNone && <SelectItem value="none">No password (Forgot password later)</SelectItem>}
        </SelectContent>
      </Select>
    </div>
  );
}

function csvCell(value) {
  const text = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/**
 * The temporary passwords from an import. They are shown only now: the server never stores them,
 * so the list must be downloaded or printed before leaving the page.
 */
export function ImportCredentials({ credentials, identifierLabel = "ID", institution = "", signInUrl }) {
  if (!credentials?.length) return null;
  const url = signInUrl || (typeof window !== "undefined" ? `${window.location.origin}/login` : "/login");

  function download() {
    const lines = [["Name", identifierLabel, "Email", "Temporary password"].map(csvCell).join(",")];
    for (const c of credentials) lines.push([c.name, c.identifier, c.email, c.password].map(csvCell).join(","));
    const blob = new Blob([`﻿${lines.join("\r\n")}\r\n`], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `temporary-passwords-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function print() {
    const slips = credentials
      .map(
        (c) => `<div class="slip">
  <div class="org">${escapeHtml(institution)}</div>
  <h2>${escapeHtml(c.name)}</h2>
  ${c.identifier ? `<p><span>${escapeHtml(identifierLabel)}</span> ${escapeHtml(c.identifier)}</p>` : ""}
  <p><span>Sign-in email</span> ${escapeHtml(c.email)}</p>
  <p><span>Temporary password</span> <code>${escapeHtml(c.password)}</code></p>
  <p class="note">Sign in at ${escapeHtml(url)}. You will be asked to choose your own password straight away.
  Keep this slip private and destroy it afterwards.</p>
</div>`,
      )
      .join("");
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Sign-in slips</title><style>
body{font-family:system-ui,sans-serif;margin:12mm;color:#000}
.wrap{display:grid;grid-template-columns:1fr 1fr;gap:6mm}
.slip{border:1px dashed #666;padding:5mm;break-inside:avoid;font-size:11pt}
.org{font-size:9pt;color:#444;text-transform:uppercase;letter-spacing:.05em}
h2{margin:2mm 0 3mm;font-size:13pt}
p{margin:1.5mm 0}span{display:inline-block;min-width:38mm;color:#444}
code{font-size:14pt;font-weight:700;letter-spacing:.06em}
.note{font-size:8.5pt;color:#444;margin-top:3mm}
</style></head><body><div class="wrap">${slips}</div></body></html>`);
    doc.close();
    frame.contentWindow.focus();
    frame.contentWindow.print();
    window.setTimeout(() => frame.remove(), 1000);
  }

  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <KeyRound />
      <AlertTitle>Save these {credentials.length} temporary password(s) now</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          They are shown only once and are not stored. Hand each person their slip; everyone must choose their own password the
          first time they sign in.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={print}>
            <Printer /> Print slips
          </Button>
          <Button size="sm" variant="outline" onClick={download}>
            <Download /> Download CSV
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
