"use client";

import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common";
import { api, errorMessage } from "@/lib/api";

/**
 * Administrators: end every sign-in of an account now (a lost or stolen phone, a shared password),
 * which also stops its notifications. `endpoint`: /users/{id}/sign-out-everywhere/ or the student one.
 */
export function SignOutEverywhereDialog({ open, onOpenChange, name, endpoint }) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Sign ${name} out everywhere?`}
      description="Every device signed in to this account is signed out now and stops receiving notifications. They can sign in again with their password; set a temporary password too if it may be known to someone else."
      confirmLabel="Sign out everywhere"
      destructive
      requireReason
      onConfirm={async (reason) => {
        try {
          const { data } = await api.post(endpoint, { reason });
          toast.success(data.signed_out === 1 ? `${name} was signed out of 1 device.`
            : data.signed_out ? `${name} was signed out of ${data.signed_out} devices.` : `${name} was not signed in anywhere.`);
        } catch (error) {
          toast.error(errorMessage(error));
          throw error;
        }
      }}
    />
  );
}
