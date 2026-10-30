"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { api, PASSWORD_CHANGE_EVENT } from "@/lib/api";
import { forgetDevice } from "@/lib/push";

const AuthContext = createContext(null);

/**
 * `initial` is the session loaded on the server (see lib/session.js). When it is present the
 * shell renders immediately; otherwise the session is loaded in the browser.
 */
export function AuthProvider({ children, initial }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState(() =>
    initial
      ? { user: initial.user, institution: initial.institution, period: initial.period, loading: false, error: null }
      : { user: null, institution: null, period: null, loading: true, error: null },
  );

  const load = useCallback(async () => {
    try {
      const [me, institution, period] = await Promise.all([
        api.get("/auth/me/"),
        api.get("/institution/"),
        api.get("/academic/current-period/"),
      ]);
      setState({ user: me.data, institution: institution.data, period: period.data.semester, loading: false, error: null });
    } catch (error) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      setState((previous) => ({ ...previous, loading: false, error }));
    }
    // pathname intentionally omitted: load once per mount, not per navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const hasInitial = Boolean(initial);
  useEffect(() => {
    if (!hasInitial) load();
  }, [load, hasInitial]);

  // A temporary password set while signed in (e.g. by an administrator): reload to show the change screen.
  useEffect(() => {
    window.addEventListener(PASSWORD_CHANGE_EVENT, load);
    return () => window.removeEventListener(PASSWORD_CHANGE_EVENT, load);
  }, [load]);

  const logout = useCallback(async () => {
    try {
      // Before the session ends: stop this device receiving this person's notifications.
      await forgetDevice();
      await api.post("/auth/logout/");
    } finally {
      // Full navigation so no signed-in state survives in memory.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    }
  }, []);

  const value = useMemo(() => ({ ...state, reload: load, logout }), [state, load, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

export function hasRole(user, ...roles) {
  return Boolean(user && roles.includes(user.role));
}
