"use client";

import { useParams } from "next/navigation";

import { ErrorState, LoadingBlock, RoleGate } from "@/components/common";
import { ResultSheet } from "@/components/results/result-sheet";
import { useApi } from "@/hooks/use-api";

export default function ResultSheetPage() {
  const { id } = useParams();
  const { data, error, loading, reload, setData } = useApi(`/result-sheets/${id}/`);
  return (
    <RoleGate roles={["ADMIN", "REGISTRAR", "RESULTS_OFFICER", "LECTURER"]}>
      {loading && !data && <LoadingBlock rows={8} />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && <ResultSheet sheet={data} onChange={setData} />}
    </RoleGate>
  );
}
