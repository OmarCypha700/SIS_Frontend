import { Suspense } from "react";

import { AuthBranding } from "@/components/auth/auth-branding";
import { AuthIllustration } from "@/components/auth/auth-illustration";
import { AuthInstitutionProvider } from "@/components/auth/auth-institution";

export default function AuthLayout({ children }) {
  return (
    <AuthInstitutionProvider className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Suspense fallback={<div className="mb-8 h-32 border-b pb-6 sm:h-36" />}>
            <AuthBranding />
          </Suspense>
          <Suspense>{children}</Suspense>
        </div>
      </div>
      <div className="relative hidden overflow-hidden border-l bg-muted lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklch,var(--primary),transparent_85%),transparent_60%)]" />
        <div className="relative flex h-full flex-col gap-10 p-12">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <AuthIllustration className="h-auto max-h-full w-full max-w-xl" />
          </div>
          <blockquote className="max-w-md space-y-3">
            <p className="text-lg font-medium leading-relaxed">
              Student records, course registration and examination results in one secure place.
            </p>
            <p className="text-sm text-muted-foreground">
              Access is limited to authorised staff and enrolled students. Activity on sensitive records is logged.
            </p>
          </blockquote>
        </div>
      </div>
    </AuthInstitutionProvider>
  );
}
