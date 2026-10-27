"use client";

import { useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { downloadFile, errorMessage } from "@/lib/api";

/**
 * "Export" button offering CSV and Excel. `formatParam` is the query parameter the endpoint
 * reads (most use `file_format`; class lists use `export`).
 */
export function ExportMenu({ url, params = {}, filename = "export", label = "Export", formatParam = "file_format", size, variant = "outline" }) {
  const [pending, setPending] = useState(false);

  async function run(format) {
    setPending(true);
    try {
      await downloadFile(url, { ...params, [formatParam]: format }, `${filename}.${format}`);
    } catch (error) {
      toast.error(errorMessage(error, "The file could not be downloaded."));
    } finally {
      setPending(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Download />}
          {label}
          <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => run("xlsx")}>
          <FileSpreadsheet /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("csv")}>
          <FileText /> CSV (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Button that downloads a server-generated PDF. */
export function PdfButton({ url, params, filename = "document.pdf", label = "Download PDF", variant = "default", size }) {
  const [pending, setPending] = useState(false);
  async function run() {
    setPending(true);
    try {
      await downloadFile(url, params, filename);
    } catch (error) {
      toast.error(errorMessage(error, "The PDF could not be generated."));
    } finally {
      setPending(false);
    }
  }
  return (
    <Button variant={variant} size={size} onClick={run} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <FileText />}
      {label}
    </Button>
  );
}
