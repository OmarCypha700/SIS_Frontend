"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { hasRole, useAuth } from "@/components/auth/auth-provider";
import { DescriptionList, PageHeader } from "@/components/common";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { api, applyFieldErrors, errorMessage } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/format";

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password."),
    new_password: z.string().min(10, "Use at least 10 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.new_password === v.confirm, { path: ["confirm"], message: "Passwords do not match." });

export default function ProfilePage() {
  const { user, reload } = useAuth();
  return (
    <div className="space-y-6">
      <PageHeader title="My account" description={`${user.full_name} · ${ROLE_LABELS[user.role]}`} />
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <DescriptionList
            items={[
              { label: "Name", value: user.full_name },
              { label: "Email", value: user.email },
              { label: "Role", value: ROLE_LABELS[user.role] },
              ...(user.student ? [{ label: "Student number", value: user.student.student_number }, { label: "Programme", value: user.student.programme }] : []),
            ]}
          />
        </CardContent>
      </Card>
      {hasRole(user, "STUDENT") ? <StudentContact /> : <StaffContact user={user} onSaved={reload} />}
      <PasswordCard onChanged={reload} />
    </div>
  );
}

function StaffContact({ user, onSaved }) {
  const [phone, setPhone] = useState(user.phone || "");
  const [pending, setPending] = useState(false);
  async function save() {
    setPending(true);
    try {
      await api.patch("/auth/me/", { phone });
      toast.success("Contact details saved.");
      onSaved();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact details</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field id="phone" label="Telephone" className="sm:w-72">
          <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Button onClick={save} disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

const CONTACT_FIELDS = ["phone", "residential_address", "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relationship"];

function StudentContact() {
  const { data } = useApi("/students/me/");
  const { register, handleSubmit, reset, formState, setError } = useForm();
  useEffect(() => {
    if (data) reset(Object.fromEntries(CONTACT_FIELDS.map((f) => [f, data[f] ?? ""])));
  }, [data, reset]);

  async function onSubmit(values) {
    try {
      await api.patch("/students/me/", values);
      toast.success("Contact details saved.");
    } catch (error) {
      applyFieldErrors(error, setError, CONTACT_FIELDS);
      toast.error(errorMessage(error));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact details</CardTitle>
        <CardDescription>Your name, programme and other official details can only be changed by the registry.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <Field id="phone" label="Telephone" error={formState.errors.phone?.message}>
            {(aria) => <Input type="tel" {...aria} {...register("phone")} />}
          </Field>
          <Field id="residential_address" label="Residential address" className="sm:col-span-2">
            {(aria) => <Textarea rows={2} {...aria} {...register("residential_address")} />}
          </Field>
          <Field id="emergency_contact_name" label="Emergency contact">
            {(aria) => <Input {...aria} {...register("emergency_contact_name")} />}
          </Field>
          <Field id="emergency_contact_phone" label="Emergency contact phone">
            {(aria) => <Input type="tel" {...aria} {...register("emergency_contact_phone")} />}
          </Field>
          <Field id="emergency_contact_relationship" label="Relationship">
            {(aria) => <Input {...aria} {...register("emergency_contact_relationship")} />}
          </Field>
          <div className="flex items-end justify-end sm:col-span-2">
            <Button type="submit" disabled={formState.isSubmitting || !data}>
              {formState.isSubmitting && <Loader2 className="animate-spin" />}
              Save contact details
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordCard({ onChanged }) {
  const { register, handleSubmit, formState, reset, setError } = useForm({ resolver: zodResolver(passwordSchema) });
  async function onSubmit(values) {
    try {
      await api.post("/auth/password/change/", { current_password: values.current_password, new_password: values.new_password });
      toast.success("Password changed.");
      reset({ current_password: "", new_password: "", confirm: "" });
      onChanged();
    } catch (error) {
      if (!applyFieldErrors(error, setError, ["current_password", "new_password"])) toast.error(errorMessage(error));
    }
  }
  return (
    <Card id="password">
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>Use at least 10 characters. Avoid common words, personal details or only numbers.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid max-w-xl gap-4" noValidate>
          <Field id="current_password" label="Current password" error={formState.errors.current_password?.message}>
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
