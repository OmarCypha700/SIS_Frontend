"use client";

import { AlertTriangle } from "lucide-react";

import { EmptyState } from "@/components/common";
import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Something went wrong on this page"
      description="The error has not affected your data. Try again, or go back to the dashboard."
      action={<Button onClick={reset}>Try again</Button>}
    />
  );
}
