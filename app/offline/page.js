import { WifiOff } from "lucide-react";

import { OfflineRetry } from "@/components/pwa/offline-retry";

export const metadata = { title: "Offline" };

/** Shown by the service worker when a page cannot be loaded without a connection. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted" aria-hidden>
        <WifiOff className="size-6 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold">You&rsquo;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Check your internet connection. For your privacy, records and results are never stored on this device, so they
        need a connection to open.
      </p>
      <OfflineRetry />
    </main>
  );
}
