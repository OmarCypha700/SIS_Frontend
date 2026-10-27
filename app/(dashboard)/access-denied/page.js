"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {
  return (
    <EmptyState
      icon={ShieldAlert}
      title="Access denied"
      description="Your account does not have permission to view this page. Contact your institution administrator if you need access."
      action={
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      }
    />
  );
}
