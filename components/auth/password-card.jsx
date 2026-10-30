"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

export function PasswordCard({ onChanged, title = "Change password", description, currentLabel = "Current password" }) {
  const { register, handleSubmit, formState, reset, setError } = useForm({ resolver: zodResolver(passwordSchema) });
  async function onSubmit(values) {
    try {
      await api.post("/auth/password/change/", { current_password: values.current_password, new_password: values.new_password });
      toast.success("Password changed.");
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
            {(aria) => <Input type="password" autoComplete="current-password" {...aria} {...register("current_password")} />}
          </Field>
          <Field id="new_password" label="New password" error={formState.errors.new_password?.message}>
            {(aria) => <Input type="password" autoComplete="new-password" {...aria} {...register("new_password")} />}
          </Field>
          <Field id="confirm" label="Confirm new password" error={formState.errors.confirm?.message}>
            {(aria) => <Input type="password" autoComplete="new-password" {...aria} {...register("confirm")} />}
          </Field>
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
