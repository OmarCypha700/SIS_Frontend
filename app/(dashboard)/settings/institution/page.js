"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingBlock, PageHeader, RoleGate } from "@/components/common";
import { Field, NativeSelect } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { api, applyFieldErrors, errorMessage } from "@/lib/api";

const TEXT_FIELDS = [
  "name", "short_name", "motto", "email", "phone", "website", "physical_address", "postal_address", "country", "timezone",
  "primary_color", "academic_year_format", "student_number_format", "cgpa_retake_policy", "gpa_decimal_places", "result_slip_footer",
];
const FLAGS = [
  ["allow_higher_level_courses", "Students may register for courses above their level"],
  ["allow_retakes", "Students may retake failed courses"],
  ["allow_cross_programme_electives", "Students may take electives from other programmes"],
  ["allow_credit_overload", "Allow exceeding the maximum credits, subject to approval"],
  ["registration_requires_approval", "Every registration must be approved by the registry"],
  ["approver_must_differ_from_submitter", "Results must be approved by someone other than the submitter"],
  ["amendments_require_second_approver", "Amendments must be approved by someone other than the requester"],
];

export default function InstitutionSettingsPage() {
  const { reload: reloadShell } = useAuth();
  const { data, error, loading, reload } = useApi("/institution/settings/");
  const { register, handleSubmit, reset, control, formState, setError } = useForm();
  const [logo, setLogo] = useState(null);

  useEffect(() => {
    if (data) reset(Object.fromEntries([...TEXT_FIELDS, ...FLAGS.map(([f]) => f)].map((f) => [f, data[f] ?? ""])));
  }, [data, reset]);

  async function onSubmit(values) {
    try {
      const body = new FormData();
      for (const [key, value] of Object.entries(values)) body.append(key, typeof value === "boolean" ? String(value) : value ?? "");
      if (logo) body.append("logo", logo);
      await api.patch("/institution/settings/", body);
      toast.success("Institution settings saved.");
      setLogo(null);
      reload();
      reloadShell();
    } catch (e) {
      const matched = applyFieldErrors(e, setError, [...TEXT_FIELDS, "logo"]);
      toast.error(matched ? "Please correct the highlighted fields." : errorMessage(e));
    }
  }

  const errors = formState.errors;
  const text = (name, label, props = {}) => (
    <Field id={name} label={label} required={props.required} error={errors[name]?.message} hint={props.hint} className={props.className}>
      {(aria) => <Input type={props.type || "text"} {...aria} {...register(name)} />}
    </Field>
  );

  return (
    <RoleGate roles={["ADMIN"]}>
      <PageHeader title="Institution settings" description="Identity, branding and academic policies for this installation." />
      {loading && !data && <LoadingBlock rows={8} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <Card>
            <CardHeader>
              <CardTitle>Identity and branding</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {text("name", "Institution name", { required: true })}
              {text("short_name", "Short name", { required: true, hint: "Used in student numbers and the sidebar" })}
              {text("motto", "Motto")}
              <Field id="primary_color" label="Brand colour" error={errors.primary_color?.message}>
                {(aria) => <Input type="color" className="h-8 w-20 p-1" {...aria} {...register("primary_color")} />}
              </Field>
              <Field id="logo" label="Logo" hint="PNG, JPG or WebP, up to 2 MB" error={errors.logo?.message}>
                {(aria) => <Input type="file" accept="image/png,image/jpeg,image/webp" {...aria} onChange={(e) => setLogo(e.target.files?.[0] ?? null)} />}
              </Field>
              {data.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.logo} alt="Current logo" className="h-16 w-auto self-end rounded border object-contain p-1" />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {text("email", "Email", { type: "email" })}
              {text("phone", "Telephone")}
              {text("website", "Website", { type: "url" })}
              {text("country", "Country")}
              {text("timezone", "Time zone", { hint: "IANA name, e.g. Africa/Accra" })}
              <Field id="physical_address" label="Physical address">
                {(aria) => <Textarea rows={2} {...aria} {...register("physical_address")} />}
              </Field>
              <Field id="postal_address" label="Postal address">
                {(aria) => <Textarea rows={2} {...aria} {...register("postal_address")} />}
              </Field>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Numbering</CardTitle>
              <CardDescription>
                Student number tokens: {"{SHORT}"} short name, {"{YEAR}"} admission year, {"{PROG}"} programme code, {"{SEQ:04}"} sequence padded to 4 digits.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {text("student_number_format", "Student number format", { required: true })}
              {text("academic_year_format", "Academic year naming", { hint: "{start}/{end} gives 2025/2026" })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Registration and results policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {FLAGS.map(([name, label]) => (
                  <Controller
                    key={name}
                    name={name}
                    control={control}
                    render={({ field }) => (
                      <label className="flex items-start gap-2 text-sm">
                        <Checkbox checked={Boolean(field.value)} onCheckedChange={(v) => field.onChange(Boolean(v))} className="mt-0.5" />
                        {label}
                      </label>
                    )}
                  />
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="cgpa_retake_policy" label="Retakes in the CGPA">
                  {(aria) => (
                    <NativeSelect {...aria} {...register("cgpa_retake_policy")}>
                      <option value="LATEST">Latest attempt counts</option>
                      <option value="BEST">Best attempt counts</option>
                      <option value="ALL">All attempts count</option>
                    </NativeSelect>
                  )}
                </Field>
                <Field id="gpa_decimal_places" label="GPA decimal places" error={errors.gpa_decimal_places?.message}>
                  {(aria) => <Input type="number" min="1" max="4" {...aria} {...register("gpa_decimal_places")} />}
                </Field>
                <Field id="result_slip_footer" label="Result slip footer" className="sm:col-span-2">
                  {(aria) => <Textarea rows={2} {...aria} {...register("result_slip_footer")} />}
                </Field>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting && <Loader2 className="animate-spin" />}
              Save settings
            </Button>
          </div>
        </form>
      )}
    </RoleGate>
  );
}
