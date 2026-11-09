"use client";

import { useEffect, useState } from "react";
import { Fingerprint, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { createPasskey, deviceName, passkeysAvailable } from "@/lib/passkeys";

/** Profile: sign in with this device's fingerprint, face or PIN instead of typing a password. */
export function PasskeyCard() {
  const { data: keys, reload } = useApi("/auth/passkeys/");
  const [available, setAvailable] = useState(null);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    let cancelled = false;
    passkeysAvailable().then((yes) => {
      if (cancelled) return;
      setAvailable(yes);
      setName(deviceName());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function setUp() {
    setPending(true);
    try {
      await createPasskey(name);
      toast.success("Done. Next time, choose “Sign in with fingerprint or face”.");
      reload();
    } catch (error) {
      toast.error(error?.response ? errorMessage(error) : error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card id="passkeys" className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="size-5" /> Sign in with fingerprint or face
        </CardTitle>
        <CardDescription>
          Use this device&apos;s fingerprint, face or screen-lock PIN instead of typing your password. Your fingerprint or face
          never leaves the device. Your password keeps working too.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {available === false && (
          <Alert>
            <AlertDescription>
              This device or browser cannot do this. It works on most phones and computers with a fingerprint reader, face
              unlock or Windows Hello, in an up-to-date browser.
            </AlertDescription>
          </Alert>
        )}
        {available && (
          <div className="space-y-2">
            <Label htmlFor="passkey-name">Name for this device</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input id="passkey-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className="sm:max-w-xs" />
              <Button onClick={setUp} disabled={pending || !name.trim()}>
                {pending ? <Loader2 className="animate-spin" /> : <Fingerprint />}
                Set up on this device
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Do not set this up on a shared or lab computer: anyone who can unlock it could then sign in as you.
            </p>
          </div>
        )}
        {keys?.length > 0 && (
          <ul className="divide-y rounded-lg border text-sm">
            {keys.map((key) => (
              <li key={key.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-medium">{key.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Added {formatDateTime(key.created_at)}
                    {key.last_used_at ? ` · last used ${formatDateTime(key.last_used_at)}` : " · not used yet"}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label={`Remove ${key.name}`} onClick={() => setRemoving(key)}>
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.name}?`}
        description="That device will no longer sign you in with a fingerprint or face. You can also delete the passkey from the device's own settings."
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          try {
            await api.delete(`/auth/passkeys/${removing.id}/`);
            toast.success("Passkey removed.");
            setRemoving(null);
            reload();
          } catch (error) {
            toast.error(errorMessage(error));
            throw error;
          }
        }}
      />
    </Card>
  );
}
