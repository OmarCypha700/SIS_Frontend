"use client";

import { useEffect, useSyncExternalStore } from "react";

import { BRANDING_KEY } from "@/lib/branding-script";

/**
 * The institution's branding (name, logo, colour) kept on the device, so pages are drawn in the
 * right colours and with the logo at once instead of after a request to the backend:
 *
 * - BRANDING_SCRIPT (lib/branding-script.js) runs at the top of every page, before anything is drawn: it applies the saved
 *   colour and starts loading the saved logo;
 * - components read the saved copy straight after the page loads (useBranding);
 * - the copy is refreshed from the API in the background, so a change shows on the next page.
 *
 * Only public branding is stored (the same data the sign-in page shows to anyone). The very first
 * visit on a device shows the default look until the first answer arrives.
 */
const EVENT = "sis-branding";

let cachedRaw;
let cachedValue = null;

function read() {
  try {
    const raw = window.localStorage.getItem(BRANDING_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedValue = raw ? JSON.parse(raw) : null;
    }
  } catch {
    cachedValue = null;
  }
  return cachedValue;
}

function subscribe(onChange) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange); // another tab saved new branding
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Save branding on the device and apply its colour (called with fresh data from the API). */
export function saveBranding(data) {
  if (!data) return;
  const value = { name: data.name, short_name: data.short_name, motto: data.motto || "", logo: data.logo || null,
                  primary_color: data.primary_color || null };
  try {
    const raw = JSON.stringify(value);
    if (raw === window.localStorage.getItem(BRANDING_KEY)) return;
    window.localStorage.setItem(BRANDING_KEY, raw);
  } catch {
    // storage unavailable (private mode): the page still works, just without the head start
  }
  const style = document.documentElement.style;
  for (const name of ["--primary", "--sidebar-primary", "--ring"]) {
    if (value.primary_color) style.setProperty(name, value.primary_color);
    else style.removeProperty(name);
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Fetch the current branding from the API and save it. */
export async function refreshBranding() {
  try {
    const response = await fetch("/api/v1/institution/", { headers: { Accept: "application/json" } });
    if (response.ok) saveBranding(await response.json());
  } catch {
    // offline: keep the saved copy
  }
}

/**
 * The saved branding (null before the first visit has fetched it). `fresh` data from the server,
 * when the page has it, replaces the saved copy. Refreshes in the background once per page.
 */
export function useBranding(fresh) {
  const saved = useSyncExternalStore(subscribe, read, () => null);
  useEffect(() => {
    if (fresh) saveBranding(fresh);
    else refreshBranding();
  }, [fresh]);
  return fresh || saved;
}
