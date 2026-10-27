"use client";

import { useParams } from "next/navigation";

import { ErrorState, LoadingBlock, RoleGate } from "@/components/common";
import { Transcript } from "@/components/results/transcript";
import { useApi } from "@/hooks/use-api";

export default function StudentTranscriptPage() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/students/${id}/academic-record/`);
  return (
    <RoleGate roles={["ADMIN", "REGISTRAR", "RESULTS_OFFICER"]}>
      {loading && !data && <LoadingBlock />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <Transcript
          record={data}
          title="Academic transcript (includes unpublished results)"
          pdfUrl={`/students/${id}/transcript-pdf/`}
          pdfParams={{ published_only: false }}
        />
      )}
    </RoleGate>
  );
}
