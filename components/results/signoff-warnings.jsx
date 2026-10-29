import { ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Shown on a submitted or approved sheet when nobody other than the submitter can approve or
 * publish it (for example a results officer who also teaches the course). Administrators are
 * notified at the same time.
 */
export function SignoffWarnings({ warnings }) {
  if (!warnings?.length) return null;
  return (
    <Alert variant="destructive" className="mb-4">
      <ShieldAlert />
      <AlertTitle>Sign-off cannot continue yet</AlertTitle>
      <AlertDescription>
        <ul className="space-y-1">
          {warnings.map((w) => (
            <li key={w.step}>{w.message}</li>
          ))}
        </ul>
        <p className="mt-1">Administrators have been notified.</p>
      </AlertDescription>
    </Alert>
  );
}
