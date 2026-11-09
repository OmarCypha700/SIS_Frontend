"use client";

import { useEffect, useState } from "react";
import { BellRing, Loader2, Share, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { enablePush, pushAvailable, pushOptedOut, pushPromptSnoozed, pushSupport, snoozePushPrompt } from "@/lib/push";

/**
 * Push notifications are on by default. Mounted once in the signed-in app:
 * - permission already granted on this device: signs it up for this account straight away, silently;
 * - not decided yet: offers "Turn on" (browsers only ask after a tap);
 * - iPhone/iPad in Safari: explains that the app must be added to the Home Screen first;
 * - turned off on the profile page, or blocked in the browser: stays quiet.
 */
export function PushPrompt() {
  const [mode, setMode] = useState(null); // null | "ask" | "install"
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function decide() {
      if (pushOptedOut()) return;
      const support = pushSupport();
      if (support === "install-first") {
        if (!pushPromptSnoozed()) setMode("install");
        return;
      }
      if (support !== "supported" || !(await pushAvailable()) || cancelled) return;
      if (Notification.permission === "granted") {
        enablePush().catch(() => {}); // already allowed: just make sure this account is signed up here
      } else if (Notification.permission === "default" && !pushPromptSnoozed()) {
        setMode("ask");
      }
    }
    const timer = window.setTimeout(decide, 1500); // let the page settle first
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (!mode) return null;

  function later() {
    snoozePushPrompt();
    setMode(null);
  }

  async function turnOn() {
    setPending(true);
    try {
      await enablePush();
      toast.success("Notifications are on for this device.");
      setMode(null);
    } catch (error) {
      // Denied or dismissed in the browser's own prompt: do not ask again for a while.
      snoozePushPrompt();
      setMode(null);
      toast.error(error.message || "Notifications could not be turned on.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-labelledby="push-prompt-title"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-xl border bg-background p-4 shadow-lg sm:inset-x-auto sm:right-4 sm:bottom-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <button type="button" onClick={later} aria-label="Not now"
              className="absolute top-2 right-2 rounded-md p-1 text-muted-foreground hover:text-foreground">
        <X className="size-4" />
      </button>
      <div className="flex gap-3 pr-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {mode === "install" ? <Share className="size-[18px]" /> : <BellRing className="size-[18px]" />}
        </span>
        <div className="min-w-0 space-y-1">
          <p id="push-prompt-title" className="font-medium">
            {mode === "install" ? "Get notifications on this iPhone or iPad" : "Turn on notifications"}
          </p>
          <p className="text-sm text-muted-foreground">
            {mode === "install" ? (
              <>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>, and open the portal from its new icon. You can then turn notifications on.</>
            ) : (
              "Be told about results, registration, fees and other updates on this device, even when the portal is closed."
            )}
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={later} disabled={pending}>
          {mode === "install" ? "OK" : "Not now"}
        </Button>
        {mode === "ask" && (
          <Button size="sm" onClick={turnOn} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Turn on
          </Button>
        )}
      </div>
    </div>
  );
}
