"use client";

import { useParams } from "next/navigation";

import { ErrorState, LoadingBlock, PageHeader, RoleGate } from "@/components/common";
import { StudentForm } from "@/components/students/student-form";
import { useApi } from "@/hooks/use-api";

export default function EditStudentPage() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/students/${id}/`);
  return (
    <RoleGate roles={["ADMIN", "REGISTRAR"]}>
      {loading && !data && <LoadingBlock />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <>
          <PageHeader title={`Edit ${data.full_name}`} description={data.student_number} />
          <StudentForm student={data} />
        </>
      )}
    </RoleGate>
  );
}
