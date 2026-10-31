"use client";

import { createContext, useContext } from "react";

import { useApi } from "@/hooks/use-api";

const InstitutionContext = createContext(null);

/** Loads the public institution profile once for the sign-in pages and applies its brand colour. */
export function AuthInstitutionProvider({ className, children }) {
  const { data } = useApi("/institution/");
  return (
    <InstitutionContext.Provider value={data}>
      <div className={className} style={data?.primary_color ? { "--primary": data.primary_color } : undefined}>
        {children}
      </div>
    </InstitutionContext.Provider>
  );
}

export function useAuthInstitution() {
  return useContext(InstitutionContext);
}
