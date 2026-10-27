"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Info, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { hasRole, useAuth } from "@/components/auth/auth-provider";
import { ErrorState, LoadingBlock, PageHeader, RoleGate } from "@/components/common";
import { Field, NativeSelect } from "@/components/forms/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { api, applyFieldErrors, errorMessage } from "@/lib/api";

const NUMBER_FIELDS = [
  "resit_min_total", "max_resits_per_course", "resit_max_grade_point", "retake_max_grade_point",
  "max_attempts_per_course", "probation_cgpa_below", "dismissal_cgpa_below", "dismiss_after_consecutive_probations",
  "promotion_min_credits_per_year", "promotion_max_outstanding_failed_credits", "promotion_min_cgpa",
  "max_referred_courses_to_proceed", "dismiss_when_referred_courses_over",
];
const FLAG_FIELDS = [
  "resits_enabled", "failed_compulsory_must_be_retaken", "dismiss_when_attempts_exhausted", "repeat_level_when_not_promoted",
  "dismissal_cgpa_inclusive", "dismiss_on_second_repeat",
];
const ALL_FIELDS = [...NUMBER_FIELDS, ...FLAG_FIELDS, "dismissal_status", "reference"];

function toFormValues(source) {
  return Object.fromEntries(
    ALL_FIELDS.map((f) => [f, source[f] ?? (FLAG_FIELDS.includes(f) ? false : f === "dismissal_status" ? "DISMISSED" : "")]),
  );
}

export default function RegulationsPage() {
  const { user } = useAuth();
  const canEdit = hasRole(user, "ADMIN");
  const { data, error, loading, reload } = useApi("/academic-regulations/");
  const { data: presets } = useApi(canEdit ? "/academic-regulations/presets/" : null);
  const { register, handleSubmit, reset, control, formState, setError } = useForm();
  const [presetKey, setPresetKey] = useState("");
  const [loadedPreset, setLoadedPreset] = useState(null);

  useEffect(() => {
    if (data) reset(toFormValues(data));
  }, [data, reset]);

  function loadPreset() {
    const preset = presets?.find((p) => p.key === presetKey);
    if (!preset) return;
    // Fills the form only; nothing is saved until "Save regulations".
    reset(toFormValues(preset.values), { keepDefaultValues: true });
    setLoadedPreset(preset);
    toast.info("Preset loaded into the form. Review the values, then save.");
  }

  async function onSubmit(values) {
    const payload = { ...values };
    for (const field of NUMBER_FIELDS) payload[field] = values[field] === "" ? null : values[field];
    if (payload.max_resits_per_course === null) payload.max_resits_per_course = 1;
    try {
      await api.patch("/academic-regulations/", payload);
      toast.success("Academic regulations saved.");
      setLoadedPreset(null);
      reload();
    } catch (e) {
      const matched = applyFieldErrors(e, setError, ALL_FIELDS);
      toast.error(matched ? "Please correct the highlighted fields." : errorMessage(e));
    }
  }

  const errors = formState.errors;
  const number = (name, label, hint, step = "1") => (
    <Field id={name} label={label} hint={hint} error={errors[name]?.message}>
      {(aria) => <Input type="number" min="0" step={step} placeholder="Off" disabled={!canEdit} {...aria} {...register(name)} />}
    </Field>
  );
  const flag = (name, label, hint) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={Boolean(field.value)} disabled={!canEdit} onCheckedChange={(v) => field.onChange(Boolean(v))} className="mt-0.5" />
          <span>
            {label}
            {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
          </span>
        </label>
      )}
    />
  );

  return (
    <RoleGate roles={["ADMIN", "REGISTRAR", "RESULTS_OFFICER"]}>
      <PageHeader
        title="Academic regulations"
        description="Rules for resits, retakes, progression, probation and dismissal. Leave a value empty to switch that rule off."
      />
      <Alert className="mb-6">
        <Info />
        <AlertTitle>Enter your institution&apos;s own regulations</AlertTitle>
        <AlertDescription>
          The system has no built-in national or regulator rules. Progression rules only produce proposals: the registry reviews
          each student&apos;s outcome in a progression review and nothing changes until the review is applied.
        </AlertDescription>
      </Alert>
      {canEdit && presets?.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Start from a preset</CardTitle>
            <CardDescription>
              Fill the form with a published policy, then review and save. Rules the policy does not mention are switched off.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <NativeSelect
                aria-label="Preset"
                value={presetKey}
                onChange={(e) => setPresetKey(e.target.value)}
                className="sm:max-w-md"
              >
                <option value="">Choose a preset…</option>
                {presets.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
              <Button type="button" variant="outline" onClick={loadPreset} disabled={!presetKey}>
                <Wand2 /> Load into form
              </Button>
            </div>
            {presetKey && <p className="text-sm text-muted-foreground">{presets.find((p) => p.key === presetKey)?.summary}</p>}
            {loadedPreset && (
              <Alert>
                <Info />
                <AlertTitle>Not saved yet</AlertTitle>
                <AlertDescription>
                  &ldquo;{loadedPreset.name}&rdquo; is loaded below. Check each value against your policy document, then choose Save regulations.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
      {loading && !data && <LoadingBlock rows={8} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <Card>
            <CardHeader>
              <CardTitle>Resits (supplementary examinations)</CardTitle>
              <CardDescription>
                A resit replaces the score of components marked as examinations; coursework is kept. If no component is marked as an
                examination, the resit score (out of 100) becomes the course total.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {flag("resits_enabled", "Offer resits for failed courses")}
              <div className="grid gap-4 sm:grid-cols-3">
                {number("resit_min_total", "Minimum course total to qualify", "e.g. 40. Empty: any failed student", "0.01")}
                {number("max_resits_per_course", "Resits allowed per course", "Across all attempts at the course")}
                {number("resit_max_grade_point", "Highest grade point a resit can earn", "e.g. 2.00 caps at C. Empty: no cap", "0.01")}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Retakes</CardTitle>
              <CardDescription>Re-registering a failed course in a later semester (allowed or not is set in Institution settings).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {number("retake_max_grade_point", "Highest grade point a retaken course can earn", "Empty: no cap", "0.01")}
                {number("max_attempts_per_course", "Attempts allowed per course", "Each registration with a published result counts. Empty: unlimited")}
              </div>
              {flag("failed_compulsory_must_be_retaken", "A failed compulsory course must be registered whenever it is offered again")}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Progression, probation and dismissal</CardTitle>
              <CardDescription>
                Promotion is only considered after the last term of an academic year. A referred course is one the student has failed
                and not yet passed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <section className="space-y-3">
                <h3 className="text-sm font-medium">Moving to the next level</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {number("promotion_min_cgpa", "Minimum CGPA to proceed", "e.g. 1.50", "0.01")}
                  {number("max_referred_courses_to_proceed", "Most referred courses a student may carry forward", "e.g. 2")}
                  {number("promotion_min_credits_per_year", "Credits needed in the year to be promoted")}
                  {number("promotion_max_outstanding_failed_credits", "Most failed credits that may be carried forward")}
                </div>
                {flag("repeat_level_when_not_promoted", "Propose repeating the level when these requirements are not met")}
              </section>
              <section className="space-y-3">
                <h3 className="text-sm font-medium">Probation</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {number("probation_cgpa_below", "Probation when CGPA is below", "e.g. 1.50", "0.01")}
                  {number("dismiss_after_consecutive_probations", "Dismissal after this many consecutive probations", "e.g. 2")}
                </div>
              </section>
              <section className="space-y-3">
                <h3 className="text-sm font-medium">Dismissal or withdrawal</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {number("dismissal_cgpa_below", "Dismissal CGPA threshold", "e.g. 1.00", "0.01")}
                  {number("dismiss_when_referred_courses_over", "When referred courses are more than", "e.g. 3")}
                  <Field id="dismissal_status" label="Record the student as" hint="Status set when a dismissal decision is applied">
                    {(aria) => (
                      <NativeSelect disabled={!canEdit} {...aria} {...register("dismissal_status")}>
                        <option value="DISMISSED">Dismissed</option>
                        <option value="WITHDRAWN">Withdrawn</option>
                      </NativeSelect>
                    )}
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {flag("dismissal_cgpa_inclusive", "Apply the CGPA threshold as “at or below” (e.g. 1.0 or less)")}
                  {flag("dismiss_on_second_repeat", "Propose dismissal when a student would repeat a level a second time")}
                  {flag("dismiss_when_attempts_exhausted", "Propose dismissal when a compulsory course is failed with no attempts left")}
                </div>
              </section>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Source</CardTitle>
            </CardHeader>
            <CardContent>
              <Field id="reference" label="Where these rules come from" hint="e.g. Academic Regulations, approved by Academic Board, 2025">
                {(aria) => <Textarea rows={2} disabled={!canEdit} {...aria} {...register("reference")} />}
              </Field>
            </CardContent>
          </Card>
          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting && <Loader2 className="animate-spin" />}
                Save regulations
              </Button>
            </div>
          )}
        </form>
      )}
    </RoleGate>
  );
}
