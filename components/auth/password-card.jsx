"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { api, applyFieldErrors, errorMessage } from "@/lib/api";

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password."),
    new_password: z.string().min(10, "Use at least 10 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, { path: ["confirm"], message: "Passwords do not match." })
  .refine((v) => v.new_password !== v.current_password, {
    path: ["new_password"],
    message: "Choose a password different from the current one.",
  });

/** `offerSignOut`: the "Sign out of my other devices" choice (not for a first, temporary password). */
export function PasswordCard({
  onChanged, title = "Change password", description, currentLabel = "Current password", offerSignOut = true,
}) {
  const { register, handleSubmit, formState, reset, setError } = useForm({ resolver: zodResolver(passwordSchema) });
  const [signOutOthers, setSignOutOthers] = useState(true);
  async function onSubmit(values) {
    try {
      await api.post("/auth/password/change/", {
        current_password: values.current_password, new_password: values.new_password, sign_out_other_devices: signOutOthers,
      });
      toast.success(signOutOthers ? "Password changed. Your other devices have been signed out." : "Password changed.");
      reset({ current_password: "", new_password: "", confirm: "" });
      onChanged?.();
    } catch (error) {
      if (!applyFieldErrors(error, setError, ["current_password", "new_password"])) toast.error(errorMessage(error));
    }
  }
  return (
    <Card id="password">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description || "Use at least 10 characters. Avoid common words, personal details or only numbers."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid max-w-xl gap-4" noValidate>
          <Field id="current_password" label={currentLabel} error={formState.errors.current_password?.message}>
            {(aria) => <PasswordInput autoComplete="current-password" {...aria} {...register("current_password")} />}
          </Field>
          <Field id="new_password" label="New password" error={formState.errors.new_password?.message}>
            {(aria) => <PasswordInput autoComplete="new-password" {...aria} {...register("new_password")} />}
          </Field>
          <Field id="confirm" label="Confirm new password" error={formState.errors.confirm?.message}>
            {(aria) => <PasswordInput autoComplete="new-password" {...aria} {...register("confirm")} />}
          </Field>
          {offerSignOut && (<label className="flex items-start gap-2 text-sm">
            <Checkbox checked={signOutOthers} onCheckedChange={(v) => setSignOutOthers(v === true)} className="mt-0.5" />
            <span>
              Sign out of my other devices
              <span className="block text-xs text-muted-foreground">
                Recommended, especially if someone else may know your password. They also stop receiving notifications.
              </span>
            </span>
          </label>)}
          <div>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting && <Loader2 className="animate-spin" />}
              Change password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
