"use client";

import { PageHeader, RoleGate } from "@/components/common";
import { StudentForm } from "@/components/students/student-form";

export default function NewStudentPage() {
  return (
    <RoleGate roles={["ADMIN", "REGISTRAR"]}>
      <PageHeader title="Add student" description="Create a student record and sign-in account." />
      <StudentForm />
    </RoleGate>
  );
}
