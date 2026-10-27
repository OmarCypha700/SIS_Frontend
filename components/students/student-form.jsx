"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Field, NativeSelect } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { api, applyFieldErrors, errorMessage } from "@/lib/api";

const optional = z.string().optional().or(z.literal(""));

const baseSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required."),
  middle_name: optional,
  last_name: z.string().trim().min(1, "Surname is required."),
  email: z.email("Enter a valid email address."),
  phone: optional,
  gender: optional,
  date_of_birth: optional,
  residential_address: optional,
  emergency_contact_name: optional,
  emergency_contact_phone: optional,
  emergency_contact_relationship: optional,
  admission_date: optional,
  admission_year: z.coerce.number({ message: "Admission year is required." }).int().min(1950).max(2100),
  entry_academic_year: optional,
});

const createSchema = baseSchema.extend({
  student_number: optional,
  programme: z.string().min(1, "Choose a programme."),
  current_level: z.string().min(1, "Choose a level."),
  password: optional,
});

const FIELD_NAMES = [...Object.keys(createSchema.shape)];

function defaults(student) {
  const values = {};
  for (const name of FIELD_NAMES) {
    const value = student?.[name];
    values[name] = value === null || value === undefined ? "" : String(value);
  }
  if (!student) values.admission_year = String(new Date().getFullYear());
  return values;
}

export function StudentForm({ student }) {
  const router = useRouter();
  const isEdit = Boolean(student?.id);
  const { register, handleSubmit, formState, setError } = useForm({
    resolver: zodResolver(isEdit ? baseSchema : createSchema),
    defaultValues: defaults(student),
  });
  const { data: programmes } = useApi(isEdit ? null : "/programmes/", { page_size: 200, is_active: true });
  const { data: levels } = useApi(isEdit ? null : "/levels/");
  const { data: years } = useApi("/academic-years/", { page_size: 50 });
  const errors = formState.errors;

  async function onSubmit(values) {
    const payload = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === "" ? null : v]));
    for (const key of ["middle_name", "phone", "gender", "residential_address", "emergency_contact_name", "emergency_contact_phone", "emergency_contact_relationship", "student_number"]) {
      if (payload[key] === null) payload[key] = "";
    }
    if (!payload.password) delete payload.password;
    try {
      const response = isEdit ? await api.patch(`/students/${student.id}/`, payload) : await api.post("/students/", payload);
      toast.success(isEdit ? "Student record updated." : `Student ${response.data.student_number} created.`);
      router.push(`/students/${response.data.id}`);
    } catch (error) {
      const matched = applyFieldErrors(error, setError, FIELD_NAMES);
      toast.error(matched ? "Please correct the highlighted fields." : errorMessage(error));
    }
  }

  const input = (name, label, props = {}) => (
    <Field id={name} label={label} required={props.required} error={errors[name]?.message} hint={props.hint}>
      {(aria) => <Input {...aria} type={props.type || "text"} autoComplete="off" {...register(name)} />}
    </Field>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
          <CardDescription>Collect only what your institution requires.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {input("first_name", "First name", { required: true })}
          {input("middle_name", "Middle name")}
          {input("last_name", "Surname", { required: true })}
          {input("date_of_birth", "Date of birth", { type: "date" })}
          <Field id="gender" label="Gender" error={errors.gender?.message}>
            {(aria) => (
              <NativeSelect {...aria} {...register("gender")}>
                <option value="">Not recorded</option>
                <option value="F">Female</option>
                <option value="M">Male</option>
                <option value="O">Other</option>
                <option value="U">Prefer not to say</option>
              </NativeSelect>
            )}
          </Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {input("email", "Email", { type: "email", required: true, hint: isEdit ? undefined : "Also used to sign in." })}
          {input("phone", "Telephone", { type: "tel" })}
          <Field id="residential_address" label="Residential address" className="sm:col-span-2" error={errors.residential_address?.message}>
            {(aria) => <Textarea rows={2} {...aria} {...register("residential_address")} />}
          </Field>
          {input("emergency_contact_name", "Emergency contact / next of kin")}
          {input("emergency_contact_phone", "Emergency contact phone", { type: "tel" })}
          {input("emergency_contact_relationship", "Relationship")}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Admission and programme</CardTitle>
          {isEdit && (
            <CardDescription>Programme, level, status and student number are changed with the audited actions on the student page.</CardDescription>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {!isEdit && input("student_number", "Student number", { hint: "Leave blank to generate one automatically." })}
          {!isEdit && (
            <Field id="programme" label="Programme" required error={errors.programme?.message}>
              {(aria) => (
                <NativeSelect {...aria} {...register("programme")}>
                  <option value="">Select…</option>
                  {(programmes?.results ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} – {p.name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
          )}
          {!isEdit && (
            <Field id="current_level" label="Level" required error={errors.current_level?.message}>
              {(aria) => (
                <NativeSelect {...aria} {...register("current_level")}>
                  <option value="">Select…</option>
                  {(levels ?? []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
          )}
          {input("admission_year", "Admission year", { type: "number", required: true })}
          {input("admission_date", "Admission date", { type: "date" })}
          <Field id="entry_academic_year" label="Academic year of entry" error={errors.entry_academic_year?.message}>
            {(aria) => (
              <NativeSelect {...aria} {...register("entry_academic_year")}>
                <option value="">Not recorded</option>
                {(years?.results ?? []).map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          {!isEdit && input("password", "Initial password", { type: "password", hint: "Optional. Without one, the student uses “Forgot password”." })}
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={formState.isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting && <Loader2 className="animate-spin" />}
          {isEdit ? "Save changes" : "Create student"}
        </Button>
      </div>
    </form>
  );
}
