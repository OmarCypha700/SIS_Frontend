"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Check, FileText, X } from "lucide-react";
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
    </RoleGate>
  );
}
