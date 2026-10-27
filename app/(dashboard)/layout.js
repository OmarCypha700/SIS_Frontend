import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoadingBlock } from "@/components/common";
import { AppShell, ShellSkeleton } from "@/components/layout/app-shell";
import { getSession } from "@/lib/session";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";

export default function DashboardLayout({ children }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <SignedInShell>
        <Suspense fallback={<LoadingBlock rows={6} />}>{children}</Suspense>
      </SignedInShell>
    </Suspense>
  );
}

/**
 * Loads the session on the server so the page is rendered together with the shell
 * (no extra browser round trip before the first paint). Pages still fetch their own
 * data in the browser and show their loading states.
 */
async function SignedInShell({ children }) {
  const [session, store] = await Promise.all([getSession(), cookies()]);
  if (session.status === "anonymous") redirect("/login");
  const initial = session.status === "ok" ? session : undefined;
  // The desktop sidebar preference is a cookie so the server renders the right width (no flicker).
  const sidebarCollapsed = store.get(SIDEBAR_COOKIE)?.value === "collapsed";
  return (
    <AppShell initial={initial} sidebarCollapsed={sidebarCollapsed}>
      {children}
    </AppShell>
  );
}
