"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Field } from "@/components/forms/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorMessage, fieldErrors } from "@/lib/api";

const schema = z
  .object({
    new_password: z.string().min(10, "Use at least 10 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, { path: ["confirm"], message: "Passwords do not match." });

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const uid = params.get("uid");
  const token = params.get("token");
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, formState, setError } = useForm({ resolver: zodResolver(schema) });

  async function onSubmit(values) {
    setFormError("");
    try {
      await api.post("/auth/password/reset/confirm/", { uid, token, new_password: values.new_password });
      setDone(true);
    } catch (error) {
      const errors = fieldErrors(error);
      if (errors.new_password) setError("new_password", { message: errors.new_password });
      else setFormError(errorMessage(error));
    }
  }

  if (!uid || !token) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          This reset link is incomplete. <Link href="/forgot-password" className="underline">Request a new one.</Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (done) {
    return (
      <div className="space-y-4">
        <CheckCircle2 className="size-8 text-emerald-600" />
        <h1 className="text-2xl font-semibold tracking-tight">Password updated</h1>
        <p className="text-sm text-muted-foreground">You can now sign in with your new password.</p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">Use at least 10 characters. Avoid common words or only numbers.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <Field id="new_password" label="New password" error={formState.errors.new_password?.message}>
          {(aria) => <Input type="password" autoComplete="new-password" {...aria} {...register("new_password")} />}
        </Field>
        <Field id="confirm" label="Confirm password" error={formState.errors.confirm?.message}>
          {(aria) => <Input type="password" autoComplete="new-password" {...aria} {...register("confirm")} />}
        </Field>
        <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="animate-spin" />}
          Update password
        </Button>
      </form>
    </div>
  );
}
