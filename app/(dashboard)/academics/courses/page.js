"use client";

import Link from "next/link";
import { Upload } from "lucide-react";

import { hasRole, useAuth } from "@/components/auth/auth-provider";
import { StatusBadge } from "@/components/common";
import { ResourcePage } from "@/components/resource-page";
import { Button } from "@/components/ui/button";
import { titleCase } from "@/lib/format";

const TYPE_OPTIONS = ["THEORY", "PRACTICAL", "CLINICAL", "PROJECT", "SEMINAR", "OTHER"].map((v) => ({ value: v, label: titleCase(v) }));

const FIELDS = [
  { name: "code", label: "Course code", required: true },
  { name: "title", label: "Title", required: true },
  { name: "credits", label: "Credits", type: "number", min: 1, required: true, default: "3" },
  { name: "department", label: "Department", type: "relation", endpoint: "/departments/", optionLabel: (d) => `${d.code} – ${d.name}`, required: true },
  { name: "course_type", label: "Course type", type: "select", options: TYPE_OPTIONS, default: "THEORY" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "prerequisites", label: "Prerequisites", type: "multirelation", endpoint: "/courses/", optionLabel: (c) => `${c.code} ${c.title}` },
  { name: "is_active", label: "Active", type: "checkbox", default: true },
];

const COLUMNS = [
  { key: "code", header: "Code", sortKey: "code", cell: (r) => <span className="font-medium">{r.code}</span> },
  { key: "title", header: "Title", sortKey: "title" },
  { key: "credits", header: "Credits", sortKey: "credits" },
  { key: "department_name", header: "Department" },
  { key: "prerequisite_codes", header: "Prerequisites", cell: (r) => (r.prerequisite_codes.length ? r.prerequisite_codes.join(", ") : "—") },
  { key: "is_active", header: "Status", cell: (r) => <StatusBadge status={r.is_active ? "ACTIVE" : "CLOSED"} label={r.is_active ? "Active" : "Inactive"} /> },
];

export default function CoursesPage() {
  const { user } = useAuth();
  const isAdmin = hasRole(user, "ADMIN");
  return (
    <ResourcePage
      title="Courses"
      description="The course catalogue. A course is offered to students through course offerings each semester."
      endpoint="/courses/"
      columns={COLUMNS}
      fields={FIELDS}
      singular="course"
      readRoles={["ADMIN", "REGISTRAR"]}
      writeRoles={["ADMIN"]}
      filters={[{ key: "department", label: "Department", endpoint: "/departments/" }, { key: "course_type", label: "Type", options: TYPE_OPTIONS }]}
      searchPlaceholder="Search code or title…"
      headerActions={
        isAdmin && (
          <Button variant="outline" asChild>
            <Link href="/academics/courses/import">
              <Upload /> Import courses
            </Link>
          </Button>
        )
      }
      defaultOrdering="code"
    />
  );
}
