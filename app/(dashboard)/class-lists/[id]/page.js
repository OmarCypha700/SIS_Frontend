"use client";

import { useParams } from "next/navigation";

import { PageHeader, RoleGate } from "@/components/common";
import { ClassList } from "@/components/class-list";
import { useApi } from "@/hooks/use-api";

export default function ClassListPage() {
  const { id } = useParams();
  const { data } = useApi(`/course-offerings/${id}/`);
  return (
    <RoleGate roles={["ADMIN", "REGISTRAR", "RESULTS_OFFICER", "LECTURER"]}>
      <PageHeader title={data ? `${data.course_code} · ${data.course_title}` : "Class list"} description={data?.semester_name} />
      <ClassList offeringId={id} />
    </RoleGate>
  );
}
