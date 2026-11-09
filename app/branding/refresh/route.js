import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";

import { BRANDING_TAG } from "@/lib/branding";

/**
 * Called after Institution settings are saved, so a new name, logo or colour shows at once instead
 * of after the five-minute cache. It only drops the cached copy (the next page reads it again from
 * the backend), so it changes nothing by itself; it still needs a signed-in browser.
 */
export async function POST() {
  if (!(await cookies()).has("sis_sessionid")) return new Response(null, { status: 401 });
  revalidateTag(BRANDING_TAG, { expire: 0 });
  return new Response(null, { status: 204 });
}
