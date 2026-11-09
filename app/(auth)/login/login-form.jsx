"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Fingerprint, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Field } from "@/components/forms/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { api, ensureCsrf, errorMessage } from "@/lib/api";
import { passkeysAvailable, signInWithPasskey } from "@/lib/passkeys";

const schema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

/** Where to go after sign-in: a path on this site only (browsers treat "/\evil.example" as another site). */
function safeNext(value) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/dashboard";
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return "/dashboard";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/dashboard";
  }
}

/** Seconds left on a sign-in wait, counting down once a second. */
function useCountdown() {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= Date.now()) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [until]);
  return [Math.max(0, Math.ceil((until - now) / 1000)), (seconds) => {
    setNow(Date.now());
    setUntil(Date.now() + seconds * 1000);
  }];
}

function waitText(seconds) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function LoginForm() {
  const params = useSearchParams();
  const [formError, setFormError] = useState(params.get("expired") ? "Your session has ended. Please sign in again." : "");
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(schema) });
  const [waiting, startWait] = useCountdown();
  const [canUsePasskey, setCanUsePasskey] = useState(false);
  const [passkeyPending, setPasskeyPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    passkeysAvailable().then((available) => !cancelled && setCanUsePasskey(available));
    return () => {
      cancelled = true;
    };
  }, []);

  const done = () => window.location.assign(safeNext(params.get("next"))); // full navigation: fresh session everywhere

  async function onSubmit(values) {
    setFormError("");
    try {
      await ensureCsrf();
      await api.post("/auth/login/", values);
      done();
    } catch (error) {
      const retryAfter = error?.response?.data?.errors?.retry_after;
      if (retryAfter) startWait(Number(retryAfter));
      setFormError(errorMessage(error, "Sign-in failed."));
    }
  }

  async function signInWithDevice() {
    setFormError("");
    setPasskeyPending(true);
    try {
      await signInWithPasskey();
      done();
    } catch (error) {
      setFormError(error?.response ? errorMessage(error) : error.message);
      setPasskeyPending(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Use the email address registered with your institution.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <Field id="email" label="Email" error={formState.errors.email?.message}>
          {(aria) => <Input type="email" autoComplete="username" autoFocus {...aria} {...register("email")} />}
        </Field>
        <Field id="password" label="Password" error={formState.errors.password?.message}>
          {(aria) => <PasswordInput autoComplete="current-password" {...aria} {...register("password")} />}
        </Field>
        <Button type="submit" className="w-full" size="lg" disabled={formState.isSubmitting || waiting > 0}>
          {formState.isSubmitting && <Loader2 className="animate-spin" />}
          {waiting > 0 ? `Try again in ${waitText(waiting)}` : "Sign in"}
        </Button>
        {canUsePasskey && (
          <>
            <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>
            <Button type="button" variant="outline" className="w-full" size="lg" onClick={signInWithDevice} disabled={passkeyPending}>
              {passkeyPending ? <Loader2 className="animate-spin" /> : <Fingerprint />}
              Sign in with fingerprint or face
            </Button>
          </>
        )}
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Forgot your password?
          </Link>
        </p>
      </form>
    </div>
  );
}
