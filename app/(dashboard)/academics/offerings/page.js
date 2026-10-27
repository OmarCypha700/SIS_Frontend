"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, Users, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/common";
import { NativeSelect } from "@/components/forms/field";
import { ResourcePage } from "@/components/resource-page";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open for registration" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const FIELDS = [
  { name: "course", label: "Course", type: "relation", endpoint: "/courses/", params: { is_active: true }, optionLabel: (c) => `${c.code} ${c.title}`, required: true },
  { name: "semester", label: "Semester", type: "relation", endpoint: "/semesters/", optionLabel: (s) => `${s.academic_year_name} ${s.name}`, required: true },
  { name: "capacity", label: "Capacity", type: "number", min: 1, hint: "Leave empty for no limit" },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, required: true, default: "OPEN" },
  { name: "programmes", label: "Eligible programmes", type: "multirelation", endpoint: "/programmes/", optionLabel: (p) => `${p.code} ${p.name}`, hint: "Empty means programmes that have the course in their curriculum" },
  { name: "levels", label: "Eligible levels", type: "multirelation", endpoint: "/levels/" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const COLUMNS = [
  {
    key: "course_code",
    header: "Course",
    sortKey: "course__code",
    cell: (r) => (
      <Link href={`/academics/offerings/${r.id}`} className="hover:underline">
        <span className="font-medium">{r.course_code}</span>
        <span className="block text-xs text-muted-foreground">{r.course_title}</span>
      </Link>
    ),
  },
  { key: "semester_name", header: "Semester" },
  { key: "credits", header: "Credits" },
  { key: "lecturers", header: "Lecturers", cell: (r) => (r.assignments.length ? r.assignments.map((a) => a.lecturer_name).join(", ") : <span className="text-amber-600">Unassigned</span>) },
  { key: "enrolled_count", header: "Enrolled", sortKey: "enrolled_count", cell: (r) => `${r.enrolled_count}${r.capacity ? ` / ${r.capacity}` : ""}` },
  { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  { key: "result_status", header: "Results", cell: (r) => (r.result_status ? <StatusBadge status={r.result_status} /> : "—") },
];

export default function OfferingsPage() {
  const [generateOpen, setGenerateOpen] = useState(false);
  return (
    <>
      <ResourcePage
        title="Course offerings"
        description="Courses delivered in a semester, with eligibility, capacity and lecturers."
        endpoint="/course-offerings/"
        columns={COLUMNS}
        fields={FIELDS}
        singular="offering"
        readRoles={["ADMIN", "REGISTRAR"]}
        writeRoles={["ADMIN", "REGISTRAR"]}
        filters={[
          { key: "semester", label: "Semester", endpoint: "/semesters/", optionLabel: (s) => `${s.academic_year_name} ${s.name}` },
          { key: "programme", label: "Programme", endpoint: "/programmes/", optionLabel: (p) => p.code },
          { key: "status", label: "Status", options: STATUS_OPTIONS },
        ]}
        searchPlaceholder="Search course…"
        rowActions={(row) => (
          <DropdownMenuItem asChild>
            <Link href={`/academics/offerings/${row.id}`}>
              <Users /> Lecturers & class list
            </Link>
          </DropdownMenuItem>
        )}
        headerActions={
          <Button variant="outline" onClick={() => setGenerateOpen(true)}>
            <Wand2 /> Generate from curriculum
          </Button>
        }
      />
      <GenerateDialog open={generateOpen} onOpenChange={setGenerateOpen} />
    </>
  );
}

function GenerateDialog({ open, onOpenChange }) {
  const { data } = useApi(open ? "/semesters/" : null, { page_size: 100 });
  const [semester, setSemester] = useState("");
  const [pending, setPending] = useState(false);
  const semesters = (data?.results ?? []).filter((s) => s.status !== "CLOSED");

  async function generate() {
    setPending(true);
    try {
      const response = await api.post("/course-offerings/generate/", { semester: Number(semester) });
      toast.success(`${response.data.created} offering(s) created.`);
      onOpenChange(false);
      window.location.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate offerings</DialogTitle>
          <DialogDescription>
            Creates an offering for every active curriculum course scheduled in the semester&apos;s term. Existing offerings are kept.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="generate-semester">Semester</Label>
          <NativeSelect id="generate-semester" value={semester} onChange={(e) => setSemester(e.target.value)}>
            <option value="">Select…</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.academic_year_name} {s.name} (term {s.term_number})
              </option>
            ))}
          </NativeSelect>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={generate} disabled={!semester || pending}>
            {pending && <Loader2 className="animate-spin" />}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
