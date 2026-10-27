"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Check, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/**
 * Lists the offerings returned by the registration options endpoint. Compulsory courses
 * are pre-selected; ineligible ones are disabled with the reason shown. The server
 * re-validates everything on submit.
 */
function initialSelection(payload) {
  const initial = new Set();
  for (const option of payload?.options ?? []) {
    if (option.is_registered || (option.is_compulsory && option.eligible && !payload.registration)) initial.add(option.offering);
  }
  return initial;
}

export function useCourseSelection(payload) {
  const [selected, setSelected] = useState(() => initialSelection(payload));
  const [source, setSource] = useState(payload);
  if (payload !== source) {
    // New data from the server: start again from what is actually registered.
    setSource(payload);
    setSelected(initialSelection(payload));
  }

  const totals = useMemo(() => {
    const chosen = (payload?.options ?? []).filter((o) => selected.has(o.offering));
    return { courses: chosen, credits: chosen.reduce((sum, o) => sum + o.credits, 0) };
  }, [payload, selected]);

  function toggle(offeringId, checked) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(offeringId);
      else next.delete(offeringId);
      return next;
    });
  }
  return { selected, toggle, totals };
}

const OTHER_PROGRAMME = "Not offered to your programme.";

export function CourseSelector({ options: allOptions, selected, onToggle, disabled }) {
  // Courses for other programmes are not relevant to the student; leave them out entirely.
  const options = allOptions.filter((o) => o.is_registered || !o.reasons.includes(OTHER_PROGRAMME));
  const groups = [
    { title: "Compulsory courses", items: options.filter((o) => o.is_compulsory) },
    { title: "Electives and other courses", items: options.filter((o) => !o.is_compulsory && o.eligible) },
    { title: "Not available to you", items: options.filter((o) => !o.is_compulsory && !o.eligible) },
  ].filter((g) => g.items.length);

  if (!options.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No courses are offered to you this semester.</p>;
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.title}>
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">{group.title}</h3>
          <ul className="divide-y rounded-lg border">
            {group.items.map((option) => {
              const checked = selected.has(option.offering);
              const blocked = !option.eligible && !option.is_registered;
              const id = `offering-${option.offering}`;
              return (
                <li key={option.offering} className={cn("flex gap-3 p-3", blocked && "bg-muted/40")}>
                  <Checkbox
                    id={id}
                    checked={checked}
                    disabled={disabled || blocked}
                    onCheckedChange={(v) => onToggle(option.offering, Boolean(v))}
                    className="mt-0.5"
                    aria-describedby={option.reasons.length ? `${id}-reasons` : undefined}
                  />
                  <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{option.course_code}</span>
                      <span className="text-sm">{option.course_title}</span>
                      {option.is_compulsory && <Badge variant="secondary">Compulsory</Badge>}
                      {option.is_retake && <Badge variant="outline">Retake</Badge>}
                      {option.is_registered && (
                        <Badge variant="outline" className="gap-1">
                          <Check className="size-3" /> Registered
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {option.credits} credit{option.credits === 1 ? "" : "s"}
                      {option.prerequisites.length > 0 && ` · Prerequisites: ${option.prerequisites.join(", ")}`}
                      {option.seats_left !== null && ` · ${option.seats_left} seat(s) left`}
                      {option.lecturers.length > 0 && ` · ${option.lecturers.join(", ")}`}
                    </p>
                    {option.reasons.length > 0 && (
                      <p id={`${id}-reasons`} className="mt-1 flex items-start gap-1 text-xs text-destructive">
                        {blocked ? <Lock className="mt-0.5 size-3 shrink-0" /> : <AlertCircle className="mt-0.5 size-3 shrink-0" />}
                        {option.reasons.join(" ")}
                      </p>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function CreditSummary({ credits, limits }) {
  const below = limits?.min && credits < limits.min;
  const above = limits?.max && credits > limits.max;
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3 text-sm">
      <span>
        Selected credits: <strong className="tabular-nums">{credits}</strong>
      </span>
      <span className={cn("text-muted-foreground", (below || above) && "font-medium text-destructive")}>
        {limits?.min || limits?.max ? `Allowed ${limits.min ?? 0}–${limits.max ?? "∞"}` : "No credit limit"}
      </span>
    </div>
  );
}

/** Render server-side registration errors (a list of {course_code?, message}). */
export function RegistrationErrors({ error }) {
  const data = error?.response?.data;
  if (!data) return null;
  const items = Array.isArray(data.errors) ? data.errors : [];
  return (
    <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <p className="font-medium text-destructive">{data.detail}</p>
      {items.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {items.map((item, i) => (
            <li key={i}>
              {item.course_code && <strong>{item.course_code}: </strong>}
              {item.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
