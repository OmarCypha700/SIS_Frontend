"use client";

import { useAuthInstitution } from "@/components/auth/auth-institution";

/** Institution logo with its full name underneath; long names wrap instead of being cut off. */
export function AuthBranding() {
  const data = useAuthInstitution();
  const name = data?.name || "Student Information System";
  return (
    <div className="mb-8 flex flex-col items-center gap-3 border-b pb-6 text-center">
      {data?.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.logo} alt="" className="size-16 rounded-lg object-contain sm:size-20" />
      ) : (
        <div className="flex size-16 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground sm:size-20 sm:text-xl">
          {(data?.short_name || "SIS").slice(0, 3)}
        </div>
      )}
      <div className="w-full min-w-0">
        <p className="text-lg font-semibold leading-snug text-balance [overflow-wrap:anywhere] sm:text-xl">{name}</p>
        {data?.motto && (
          <p className="mt-1 text-sm text-muted-foreground text-balance [overflow-wrap:anywhere]">{data.motto}</p>
        )}
      </div>
    </div>
  );
}
