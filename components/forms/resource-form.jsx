"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Field, NativeSelect } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { api, applyFieldErrors, errorMessage } from "@/lib/api";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Field config: { name, label, type, required, options, endpoint, optionLabel, hint, span, min, max, step }
 * Types: text | textarea | number | date | datetime | checkbox | select | relation | multirelation | color
 */
function toFormValues(fields, record) {
  const values = {};
  for (const field of fields) {
    const raw = record?.[field.name];
    if (field.type === "checkbox") values[field.name] = raw ?? field.default ?? false;
    else if (field.type === "datetime") values[field.name] = toDateTimeLocal(raw);
    else if (field.type === "multirelation") values[field.name] = (raw ?? []).map(String);
    else values[field.name] = raw === null || raw === undefined ? (field.default ?? "") : String(raw);
  }
  return values;
}

function toPayload(fields, values) {
  const payload = {};
  for (const field of fields) {
    if (field.readOnly) continue;
    const value = values[field.name];
    if (field.type === "checkbox") payload[field.name] = Boolean(value);
    else if (field.type === "datetime") payload[field.name] = fromDateTimeLocal(value);
    else if (field.type === "multirelation") payload[field.name] = (value ?? []).map(Number);
    else if (field.type === "number" || field.type === "relation") payload[field.name] = value === "" ? null : Number(value);
    else if (field.type === "date") payload[field.name] = value || null;
    else payload[field.name] = value ?? "";
  }
  return payload;
}

export function ResourceFormDialog({ open, onOpenChange, title, description, endpoint, fields, record, onSaved, transform }) {
  const form = useForm({ defaultValues: toFormValues(fields, record) });
  const { register, handleSubmit, formState, reset, setError, control } = form;

  useEffect(() => {
    if (open) reset(toFormValues(fields, record));
  }, [open, record, fields, reset]);

  async function onSubmit(values) {
    let payload = toPayload(fields, values);
    if (transform) payload = transform(payload);
    try {
      const response = record?.id
        ? await api.patch(`${endpoint}${record.id}/`, payload)
        : await api.post(endpoint, payload);
      toast.success(record?.id ? "Changes saved." : "Record created.");
      onSaved?.(response.data);
      onOpenChange(false);
    } catch (error) {
      const matched = applyFieldErrors(error, setError, fields.map((f) => f.name));
      toast.error(matched ? "Please correct the highlighted fields." : errorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !formState.isSubmitting && onOpenChange(next)}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          {fields.map((field) => (
            <FieldControl key={field.name} field={field} register={register} control={control} error={formState.errors[field.name]?.message} />
          ))}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={formState.isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting && <Loader2 className="animate-spin" />}
              {record?.id ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldControl({ field, register, control, error }) {
  const id = `field-${field.name}`;
  const rules = field.required ? { required: `${field.label} is required.` } : {};
  const span = field.span === 2 || ["textarea", "multirelation"].includes(field.type) ? "sm:col-span-2" : "";

  if (field.type === "checkbox") {
    return (
      <div className={cn("flex items-start gap-2 pt-1", span)}>
        <Controller
          name={field.name}
          control={control}
          render={({ field: f }) => <Checkbox id={id} checked={Boolean(f.value)} onCheckedChange={(v) => f.onChange(Boolean(v))} disabled={field.readOnly} />}
        />
        <div className="grid gap-0.5">
          <label htmlFor={id} className="text-sm leading-none font-medium">
            {field.label}
          </label>
          {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
        </div>
      </div>
    );
  }

  return (
    <Field id={id} label={field.label} required={field.required} error={error} hint={field.hint} className={span}>
      {(aria) => {
        const common = { id, ...aria, disabled: field.readOnly, ...register(field.name, rules) };
        switch (field.type) {
          case "textarea":
            return <Textarea rows={3} {...common} />;
          case "number":
            return <Input type="number" min={field.min} max={field.max} step={field.step ?? "any"} {...common} />;
          case "date":
            return <Input type="date" {...common} />;
          case "datetime":
            return <Input type="datetime-local" {...common} />;
          case "color":
            return <Input type="color" className="h-8 w-20 p-1" {...common} />;
          case "select":
            return (
              <NativeSelect {...common}>
                <option value="">Select…</option>
                {field.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            );
          case "relation":
            return <RelationSelect field={field} common={common} />;
          case "multirelation":
            return <MultiRelation field={field} control={control} />;
          default:
            return <Input type={field.inputType || "text"} {...common} />;
        }
      }}
    </Field>
  );
}

function useOptions(field) {
  const { data, loading } = useApi(field.endpoint, { page_size: 200, ...(field.params || {}) });
  const items = Array.isArray(data) ? data : data?.results ?? [];
  return {
    loading,
    options: items.map((item) => ({ value: String(item.id), label: field.optionLabel ? field.optionLabel(item) : item.name })),
  };
}

function RelationSelect({ field, common }) {
  const { options, loading } = useOptions(field);
  return (
    <NativeSelect {...common}>
      <option value="">{loading ? "Loading…" : "Select…"}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  );
}

function MultiRelation({ field, control }) {
  const { options, loading } = useOptions(field);
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: f }) => {
        const selected = new Set(f.value ?? []);
        return (
          <div className="max-h-44 overflow-y-auto rounded-lg border p-2">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!loading && options.length === 0 && <p className="text-sm text-muted-foreground">No options available.</p>}
            <div className="grid gap-1.5 sm:grid-cols-2">
              {options.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected.has(o.value)}
                    onCheckedChange={(checked) => {
                      const next = new Set(selected);
                      if (checked) next.add(o.value);
                      else next.delete(o.value);
                      f.onChange([...next]);
                    }}
                  />
                  <span className="truncate">{o.label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      }}
    />
  );
}
