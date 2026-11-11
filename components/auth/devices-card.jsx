"use client";

import { useEffect, useState } from "react";
import { Laptop, LogOut, Smartphone, Tablet } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/format";

const ICONS = { iPhone: Smartphone, Android: Smartphone, iPad: Tablet };

/** Profile: where this account is signed in, with sign-out for any other device or all of them. */
export function DevicesCard({ refreshKey = 0 }) {
  const { data: devices, loading, reload } = useApi("/auth/devices/");
  useEffect(() => {
    if (refreshKey) reload(); // e.g. after a password change signed the other devices out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);
  const [ending, setEnding] = useState(null); // a device, or "others"
  const others = (devices || []).filter((device) => !device.current);

  async function signOut() {
    try {
      if (ending === "others") {
        const { data } = await api.post("/auth/devices/sign-out-others/");
        toast.success(data.signed_out === 1 ? "Signed out of 1 other device." : `Signed out of ${data.signed_out} other devices.`);
      } else {
        await api.delete(`/auth/devices/${ending.id}/`);
        toast.success(`Signed out of ${ending.browser} on ${ending.system}.`);
      }
      setEnding(null);
      reload();
    } catch (error) {
      toast.error(errorMessage(error));
      throw error;
    }
  }

  return (
    <Card id="devices" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Signed-in devices</CardTitle>
        <CardDescription>
          Where your account is signed in now. If you see a device you don&apos;t recognise, sign it out and change your
          password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !devices ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <ul className="divide-y rounded-lg border text-sm" aria-label="Signed-in devices">
            {(devices || []).map((device) => {
              const Icon = ICONS[device.system] || Laptop;
              const label = `${device.browser} on ${device.system}`;
              return (
                <li key={device.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {label}
                      {device.current && <Badge variant="secondary">This device</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {device.current ? "Active now" : `Active ${timeAgo(device.last_seen_at)}`}
                      {" · "}signed in {formatDateTime(device.signed_in_at)}
                      {device.method === "PASSKEY" ? " with fingerprint or face" : ""}
                      {device.ip_address ? ` · network address ${device.ip_address}` : ""}
                      {device.notifications ? " · receives notifications" : ""}
                    </p>
                  </div>
                  {!device.current && (
                    <Button variant="outline" size="sm" onClick={() => setEnding(device)} aria-label={`Sign out ${label}`}>
                      <LogOut /> Sign out
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {others.length > 0 && (
          <Button variant="outline" onClick={() => setEnding("others")}>
            <LogOut /> Sign out of all other devices
          </Button>
        )}
      </CardContent>
      <ConfirmDialog
        open={Boolean(ending)}
        onOpenChange={(open) => !open && setEnding(null)}
        title={
          ending === "others"
            ? `Sign out of ${others.length === 1 ? "1 other device" : `${others.length} other devices`}?`
            : `Sign out of ${ending?.browser} on ${ending?.system}?`
        }
        description="They will need your password (or fingerprint or face) to sign in again, and stop receiving notifications. This device stays signed in."
        confirmLabel="Sign out"
        destructive
        onConfirm={signOut}
      />
    </Card>
  );
}
