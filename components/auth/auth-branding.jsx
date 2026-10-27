"use client";

import { useApi } from "@/hooks/use-api";

export function AuthBranding() {
  const { data } = useApi("/institution/");
  return (
    <div className="mb-8 flex items-center gap-3" style={data?.primary_color ? { "--primary": data.primary_color } : undefined}>
      {data?.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.logo} alt="" className="size-10 rounded object-contain" />
      ) : (
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          {(data?.short_name || "SIS").slice(0, 3)}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate font-semibold leading-tight">{data?.name || "Student Information System"}</p>
        {data?.motto && <p className="truncate text-xs text-muted-foreground">{data.motto}</p>}
      </div>
    </div>
  );
}
