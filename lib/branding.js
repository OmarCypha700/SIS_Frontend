import "server-only";

import { cacheLife, cacheTag } from "next/cache";

const backendUrl = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export const BRANDING_TAG = "branding";
const FALLBACK = { name: "Student Information System", short_name: "SIS", motto: "", logo: null, primary_color: null };

/**
 * The institution's public branding (name, logo, colour) on the server, for the signed-in session
 * and the app manifest, so they do not ask the backend on every request.
 *
 * Cached with stale-while-revalidate: after five minutes the next request still gets the copy it has
 * while a fresh one loads in the background. Saving Institution settings refreshes it at once
 * (app/branding/refresh). Never throws: without the API the default look is used, kept for a minute.
 *
 * Not for layouts: with cache components and partial prefetching, a layout waiting on this left
 * route prefetches open. Pages get the colour and logo before paint from the copy saved on the
 * device instead (lib/branding-client.js).
 */
export async function getBranding() {
  "use cache";
  cacheTag(BRANDING_TAG);
  try {
    const response = await fetch(`${backendUrl}/api/v1/institution/`, {
      headers: { Accept: "application/json" },
      // A free hosting plan can take several seconds to answer; the default look is the last resort.
      signal: AbortSignal.timeout(12000),
    });
    if (response.ok) {
      cacheLife({ stale: 300, revalidate: 300, expire: 60 * 60 * 24 * 30 });
      return { ...FALLBACK, ...(await response.json()) };
    }
  } catch {
    // unreachable: fall through to the default look
  }
  // Try again soon: the default name must not stick (it would end up on installed apps).
  cacheLife({ stale: 15, revalidate: 15, expire: 60 });
  return FALLBACK;
}
