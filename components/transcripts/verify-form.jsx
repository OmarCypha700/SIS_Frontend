"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VerifyForm({ initial = "" }) {
  const router = useRouter();
  const [code, setCode] = useState(initial);
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (clean.length === 10) router.push(`/verify/${clean}`);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="verify-code">Verification code</Label>
        <Input
          id="verify-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="XXXXX-XXXXX"
          autoComplete="off"
          className="font-mono uppercase tracking-wider"
        />
        <p className="text-xs text-muted-foreground">Printed next to the QR code on the transcript.</p>
      </div>
      <Button type="submit" className="w-full" disabled={clean.length !== 10}>
        <ShieldCheck /> Check transcript
      </Button>
    </form>
  );
}
