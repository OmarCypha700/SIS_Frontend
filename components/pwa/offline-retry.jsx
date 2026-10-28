"use client";

import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

/** The service worker shows the offline page in place of the requested page, so retrying is a reload. */
export function OfflineRetry() {
  const router = useRouter();
  function retry() {
    if (window.location.pathname === "/offline") router.push("/dashboard");
    else window.location.reload();
  }
  return (
    <Button onClick={retry}>
      <RotateCw /> Try again
    </Button>
  );
}
