import { NextResponse } from "next/server";

/**
 * Optimistic check only: send visitors without a session cookie to the sign-in page.
 * Real authentication and authorisation happen in Django on every API request.
 */
const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

export function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const hasSession = request.cookies.has("sis_sessionid");
  if (!isPublic && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Skip API/media proxying, Next.js internals and static files.
  matcher: ["/((?!api/|media/|_next/|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt)$).*)"],
};
