import "server-only";

import { cookies } from "next/headers";

const backendUrl = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

async function getJson(path, cookieHeader) {
  const response = await fetch(`${backendUrl}/api/v1${path}`, {
    headers: { Accept: "application/json", Cookie: cookieHeader },
    cache: "no-store",
  });
  return { status: response.status, data: response.ok ? await response.json() : null };
}

/**
 * The signed-in user, institution branding and current period, read on the server by
 * forwarding the browser's session cookie to Django. Returns:
 *   { status: "anonymous" }               no session or the session has expired
 *   { status: "ok", user, institution, period }
 *   { status: "unavailable" }             the API could not be reached; the client retries
 */
export async function getSession() {
  const store = await cookies();
  if (!store.has("sis_sessionid")) return { status: "anonymous" };
  const cookieHeader = store
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");
  try {
    const [me, institution, period] = await Promise.all([
      getJson("/auth/me/", cookieHeader),
      getJson("/institution/", cookieHeader),
      getJson("/academic/current-period/", cookieHeader),
    ]);
    if (me.status === 401 || me.status === 403) return { status: "anonymous" };
    if (!me.data) return { status: "unavailable" };
    return { status: "ok", user: me.data, institution: institution.data, period: period.data?.semester ?? null };
  } catch {
    return { status: "unavailable" };
  }
}
