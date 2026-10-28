"use client";

import { useEffect } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";

import { useOnline } from "@/lib/pwa";

/**
 * Registers the service worker, offers updates, and shows a banner while offline.
 * Mounted once in the root layout.
 */
export function PwaProvider() {
  const online = useOnline();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    let reloading = false;
    let timer = null;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

    function offerUpdate(worker) {
      toast("A new version of the portal is available.", {
        id: "sw-update",
        duration: Infinity,
        action: { label: "Reload", onClick: () => worker.postMessage({ type: "SKIP_WAITING" }) },
      });
    }

    // In development the worker does not cache build assets (they change on every edit).
    const url = process.env.NODE_ENV === "development" ? "/sw.js?dev=1" : "/sw.js";
    navigator.serviceWorker
      .register(url, { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) offerUpdate(worker);
          });
        });
        // Installed apps can stay open for days: look for updates every hour.
        timer = window.setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
      })
      .catch(() => {});
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => {
      window.clearInterval(timer);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (online) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-lg"
    >
      <WifiOff className="size-4" /> You&rsquo;re offline. Changes can&rsquo;t be saved until the connection is back.
    </div>
  );
}
