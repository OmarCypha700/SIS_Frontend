"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Check, FileText, LogOut, X } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog, ErrorState, LoadingBlock, PageHeader, RoleGate, StatusBadge } from "@/components/common";
import { RegisteredCourses, RegistrationTimeline } from "@/components/registration/registration-detail";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";

export default function RegistrationDetailPage() {
  const { id } = useParams();
  const { data, error, loading, reload, setData } = useApi(`/registrations/${id}/`);
  const [review, setReview] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);

  if (loading && !data) return <LoadingBlock />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <RoleGate roles={["ADMIN", "REGISTRAR"]}>
      <PageHeader
        title={`${data.student_name} · ${data.semester_name}`}
        description={
          <span className="flex items-center gap-2">
            <Link href={`/students/${data.student}`} className="hover:underline">
              {data.student_number}
            </Link>
            · {data.programme_code} · {data.level_name}
            <StatusBadge status={data.status} label={data.status_display} />
          </span>
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/registration/slip/${data.id}`}>
                <FileText /> Slip
              </Link>
            </Button>
            {["PENDING", "REGISTERED"].includes(data.status) && (
              <Button variant="outline" onClick={() => setWithdrawing(true)}>
                <LogOut /> Withdraw from semester
              </Button>
            )}
            {data.status === "PENDING" && (
              <>
                <Button variant="outline" onClick={() => setReview("reject")}>
                  <X /> Reject
                </Button>
                <Button onClick={() => setReview("approve")}>
                  <Check /> Approve
                </Button>
              </>
            )}
          </>
        }
      />
      {data.status === "PENDING" && data.requires_approval_reason && (
        <Alert className="mb-4">
          <AlertTitle>Approval required</AlertTitle>
          <AlertDescription>{data.requires_approval_reason}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Registered courses</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <RegisteredCourses registration={data} />
          </CardContent>
        </Card>
        <RegistrationTimeline events={data.events} />
      </div>
      <ConfirmDialog
        open={review !== null}
        onOpenChange={(open) => !open && setReview(null)}
        title={review === "approve" ? "Approve this registration?" : "Reject this registration?"}
        description={review === "reject" ? "The student's courses will be dropped and they may register again while the window is open." : undefined}
        confirmLabel={review === "approve" ? "Approve" : "Reject"}
        destructive={review === "reject"}
        requireReason
        reasonLabel="Comment"
        reasonOptional={review === "approve"}
        onConfirm={async (comment) => {
          try {
            const response = await api.post(`/registrations/${id}/review/`, { approve: review === "approve", comment });
            setData(response.data);
            toast.success(review === "approve" ? "Registration approved." : "Registration rejected.");
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
      <ConfirmDialog
        open={withdrawing}
        onOpenChange={setWithdrawing}
        title="Withdraw this student from the semester?"
        description="For a student who defers, withdraws or is suspended mid-semester. Courses whose results are still being entered are dropped, so the student leaves those class lists; marks already entered are kept. Courses already submitted or published stay on the record. If nothing remains, the registration is cancelled. Change the student's status separately if needed."
        confirmLabel="Withdraw"
        destructive
        requireReason
        onConfirm={async (reason) => {
          try {
            const response = await api.post(`/registrations/${id}/withdraw/`, { reason });
            setData(response.data);
            toast.success("Student withdrawn from the semester.");
          } catch (e) {
            toast.error(errorMessage(e));
            throw e;
          }
        }}
      />
    </RoleGate>
  );
}
