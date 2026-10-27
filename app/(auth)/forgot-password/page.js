"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";

import { Field } from "@/components/forms/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api";

const schema = z.object({ email: z.email("Enter a valid email address.") });

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(schema) });

  async function onSubmit(values) {
    setFormError("");
    try {
      await api.post("/auth/password/reset/", values);
      setSent(true);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  if (sent) {
    return (
      <div className="space-y-4">
        <MailCheck className="size-8 text-primary" />
        <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          If an account exists for that address, we have sent a link to reset your password. The link expires in two hours.
        </p>
        <Button asChild variant="outline">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1 text-sm text-muted-foreground">Enter your email and we will send you a reset link.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <Field id="email" label="Email" error={formState.errors.email?.message}>
          {(aria) => <Input type="email" autoComplete="email" {...aria} {...register("email")} />}
        </Field>
        <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="animate-spin" />}
          Send reset link
        </Button>
        <p className="text-center text-sm">
          <Link href="/login" className="text-muted-foreground hover:text-foreground hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
