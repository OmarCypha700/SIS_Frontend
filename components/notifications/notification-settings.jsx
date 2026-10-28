"use client";

import { useEffect, useState } from "react";
import { BellRing, Download, Loader2, Share, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { hasRole, useAuth } from "@/components/auth/auth-provider";
import { useNotifications } from "@/components/notifications/notification-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api, errorMessage } from "@/lib/api";
import { playNotificationSound } from "@/lib/notification-sound";
import { currentSubscription, disablePush, enablePush, isIos, pushSupport } from "@/lib/push";
import { useInstallPrompt, useStandalone } from "@/lib/pwa";

/** Profile → Notifications: push on this device, sound, email alerts (staff) and installing the app. */
export function NotificationSettings() {
  const { user, reload } = useAuth();
  const { refresh } = useNotifications();
  const { canInstall, install } = useInstallPrompt();
  const standalone = useStandalone();
  const [push, setPush] = useState({ support: null, enabled: false, pending: false });

  useEffect(() => {
    const support = pushSupport();
    Promise.resolve(support === "supported" ? currentSubscription() : null)
      .then((subscription) => setPush({ support, enabled: Boolean(subscription), pending: false }))
      .catch(() => setPush({ support, enabled: false, pending: false }));
  }, []);

  async function togglePush(on) {
    setPush((p) => ({ ...p, pending: true }));
    try {
      if (on) await enablePush();
      else await disablePush();
      setPush((p) => ({ ...p, enabled: on, pending: false }));
      toast.success(on ? "Push notifications are on for this device." : "Push notifications are off for this device.");
    } catch (error) {
      setPush((p) => ({ ...p, pending: false }));
      toast.error(error?.response ? errorMessage(error) : error.message);
    }
  }

  async function savePreference(field, value) {
    try {
      await api.patch("/auth/me/", { [field]: value });
      await reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function sendTest() {
    try {
      const { data } = await api.post("/notifications/push/test/");
      refresh();
      toast.success(
        data.devices
          ? `Test sent to ${data.devices} device${data.devices === 1 ? "" : "s"}. It may take a few seconds.`
          : "Test notification added. Turn on push notifications to receive it on this device too.",
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const ios = push.support !== null && isIos();
  return (
    <Card id="notifications" className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="size-5" /> Notifications
        </CardTitle>
        <CardDescription>
          Choose how you hear about results, registration and other work that needs your attention.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Setting
          id="push"
          label="Push notifications on this device"
          hint="Alerts appear on this phone or computer even when the portal is closed. Turn this on separately on each device."
          checked={push.enabled}
          disabled={push.support !== "supported" || push.pending}
          pending={push.pending}
          onChange={togglePush}
        />
        {push.support === "install-first" && (
          <Alert>
            <Share />
            <AlertTitle>Add the portal to your Home Screen first</AlertTitle>
            <AlertDescription>
              On iPhone and iPad, notifications only work for installed apps (iOS 16.4 or later). In Safari, tap the Share
              button, choose <strong>Add to Home Screen</strong>, open the portal from the new icon, then turn this on.
            </AlertDescription>
          </Alert>
        )}
        {push.support === "unsupported" && (
          <p className="text-sm text-muted-foreground">
            This browser does not support push notifications. You will still see notifications in the bell at the top of
            the page.
          </p>
        )}

        <Setting
          id="sound"
          label="Notification sound"
          hint="Plays when a new notification arrives while the portal is open. When it is closed, your device's own notification sound is used."
          checked={user.notification_sound !== false}
          onChange={(value) => savePreference("notification_sound", value)}
          extra={
            <Button variant="ghost" size="sm" onClick={() => playNotificationSound({ force: true })}>
              <Volume2 /> Preview
            </Button>
          }
        />

        {!hasRole(user, "STUDENT") && (
          <Setting
            id="email-alerts"
            label="Email me when something needs my action"
            hint="For example, results waiting for your approval. Password reset emails are always sent."
            checked={user.email_alerts !== false}
            onChange={(value) => savePreference("email_alerts", value)}
          />
        )}

        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button variant="outline" onClick={sendTest}>
            <BellRing /> Send a test notification
          </Button>
          {!standalone && canInstall && (
            <Button variant="outline" onClick={install}>
              <Download /> Install the app
            </Button>
          )}
        </div>
        {!standalone && !canInstall && ios && push.support !== "install-first" && (
          <p className="text-sm text-muted-foreground">
            To install on iPhone or iPad: tap Share in Safari, then <strong>Add to Home Screen</strong>.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Setting({ id, label, hint, checked, onChange, disabled, pending, extra }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{hint}</p>
        {extra}
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
      </div>
    </div>
  );
}
