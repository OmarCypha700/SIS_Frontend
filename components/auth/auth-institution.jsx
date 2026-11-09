"use client";

import { createContext, useContext } from "react";

import { useBranding } from "@/lib/branding-client";

const InstitutionContext = createContext(null);

/**
 * The public institution profile for the sign-in pages. It comes from the copy saved on this
 * device (lib/branding-client.js), so the logo, name and colour are there at once; the copy is
 * refreshed in the background. On a device's very first visit it is null until the API answers.
 */
export function AuthInstitutionProvider({ className, children }) {
  const branding = useBranding();
  return (
    <InstitutionContext.Provider value={branding}>
      <div className={className} style={branding?.primary_color ? { "--primary": branding.primary_color } : undefined}>
        {children}
      </div>
    </InstitutionContext.Provider>
  );
}

export function useAuthInstitution() {
  return useContext(InstitutionContext);
}
