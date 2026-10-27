"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Field } from "@/components/forms/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ensureCsrf, errorMessage } from "@/lib/api";

const schema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

function safeNext(value) {
  // Only allow same-site relative paths to avoid open redirects.
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export function LoginForm() {
  const params = useSearchParams();
  const [formError, setFormError] = useState(params.get("expired") ? "Your session has ended. Please sign in again." : "");
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(schema) });

  async function onSubmit(values) {
    setFormError("");
    try {
      await ensureCsrf();
      await api.post("/auth/login/", values);
      // Full navigation so every component starts with the new session.
      window.location.assign(safeNext(params.get("next")));
    } catch (error) {
      setFormError(errorMessage(error, "Sign-in failed."));
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
          {(aria) => <Input type="password" autoComplete="current-password" {...aria} {...register("password")} />}
        </Field>
        <Button type="submit" className="w-full" size="lg" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="animate-spin" />}
          Sign in
        </Button>
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Forgot your password?
          </Link>
        </p>
      </form>
    </div>
  );
}
