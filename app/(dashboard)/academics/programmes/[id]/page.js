"use client";

import { useParams } from "next/navigation";

import { DescriptionList, ErrorState, LoadingBlock, PageHeader, StatusBadge } from "@/components/common";
import { ResourcePage } from "@/components/resource-page";
import { Card, CardContent } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { titleCase } from "@/lib/format";

const CATEGORY_OPTIONS = [
  { value: "COMPULSORY", label: "Compulsory" },
  { value: "ELECTIVE", label: "Elective" },
];

const FIELDS = [
  { name: "course", label: "Course", type: "relation", endpoint: "/courses/", params: { is_active: true }, optionLabel: (c) => `${c.code} ${c.title}`, required: true, span: 2 },
  { name: "level", label: "Level", type: "relation", endpoint: "/levels/", required: true },
  { name: "term_number", label: "Term", type: "number", min: 1, required: true, default: "1", hint: "Which term of the year it is normally taken" },
  { name: "category", label: "Category", type: "select", options: CATEGORY_OPTIONS, required: true, default: "COMPULSORY" },
];

const COLUMNS = [
  { key: "course_code", header: "Course", cell: (r) => <span className="font-medium">{r.course_code}</span> },
  { key: "course_title", header: "Title" },
  { key: "course_credits", header: "Credits" },
  { key: "level_name", header: "Level", sortKey: "level__order" },
  { key: "term_number", header: "Term", sortKey: "term_number" },
  { key: "category", header: "Category", cell: (r) => <StatusBadge status={r.category === "COMPULSORY" ? "APPROVED" : "DRAFT"} label={titleCase(r.category)} /> },
];

export default function ProgrammeDetailPage() {
  const { id } = useParams();
  const { data: programme, error, loading, reload } = useApi(`/programmes/${id}/`);

  if (loading && !programme) return <LoadingBlock />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-8">
      <PageHeader title={`${programme.code} · ${programme.name}`} description={programme.department_name} />
      <Card>
        <CardContent>
          <DescriptionList
            className="lg:grid-cols-4"
            items={[
              { label: "Award", value: programme.award_type_display },
              { label: "Duration", value: `${programme.duration_years} years` },
              { label: "Credits to graduate", value: programme.required_credits },
              { label: "Credits per semester", value: `${programme.min_credits_per_semester ?? "–"} to ${programme.max_credits_per_semester ?? "–"}` },
            ]}
          />
        </CardContent>
      </Card>
      <ResourcePage
        title="Curriculum"
        description="Compulsory courses for a student's level and term must be registered; electives are optional."
        endpoint="/programme-courses/"
        params={{ programme: id }}
        transform={(payload) => ({ ...payload, programme: Number(id) })}
        columns={COLUMNS}
        fields={FIELDS}
        singular="curriculum course"
        readRoles={["ADMIN", "REGISTRAR"]}
        writeRoles={["ADMIN"]}
        filters={[{ key: "level", label: "Level", endpoint: "/levels/" }, { key: "category", label: "Category", options: CATEGORY_OPTIONS }]}
        defaultOrdering="level__order"
        hideHeader
      />
    </div>
  );
}
