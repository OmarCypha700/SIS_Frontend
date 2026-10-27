"use client";

import { ErrorState, LoadingBlock, RoleGate } from "@/components/common";
import { Transcript } from "@/components/results/transcript";
import { useApi } from "@/hooks/use-api";

export default function MyTranscriptPage() {
  const { data, error, loading, reload } = useApi("/my-results/");
  return (
    <RoleGate roles={["STUDENT"]}>
      {loading && !data && <LoadingBlock />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && <Transcript record={data} title="Statement of results" pdfUrl="/my-results/transcript-pdf/" />}
    </RoleGate>
  );
}
