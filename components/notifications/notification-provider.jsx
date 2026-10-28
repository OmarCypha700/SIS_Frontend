"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { playNotificationSound, unlockSoundOnInteraction } from "@/lib/notification-sound";
import { setBadge } from "@/lib/push";

const NotificationContext = createContext(null);
const POLL_MS = 60 * 1000;

/**
 * Unread count for the bell and the app-icon badge. Refreshed every minute, when the window
 * regains focus, and immediately when the service worker receives a push. A rising count plays
 * the notification sound (if the person has it switched on).
 */
export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(null);
  const [version, setVersion] = useState(0); // bumps when the list should be reloaded
  const previous = useRef(null);
  const soundOn = user?.notification_sound !== false;
  const soundRef = useRef(soundOn);
  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  const apply = useCallback((count) => {
    if (previous.current !== null && count > previous.current && soundRef.current) playNotificationSound();
    if (previous.current !== count) setVersion((v) => v + 1);
    previous.current = count;
    setUnread(count);
    setBadge(count);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications/unread-count/");
      apply(data.unread);
    } catch {
      // Offline or signed out: keep the last known count.
    }
  }, [apply]);

  useEffect(() => unlockSoundOnInteraction(), []);

  useEffect(() => {
    if (!user) return undefined;
    const first = window.setTimeout(refresh, 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, [user, refresh]);

  // Messages from the service worker: a push arrived, or a notification was clicked.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    function onMessage(event) {
      const message = event.data || {};
      if (message.type === "notification") {
        if (typeof message.notification?.unread === "number") apply(message.notification.unread);
        else refresh();
      }
      if (message.type === "navigate" && message.url) router.push(message.url);
    }
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [apply, refresh, router]);

  const markRead = useCallback(
    async (id) => {
      try {
        await api.post(`/notifications/${id}/read/`);
      } finally {
        refresh();
      }
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    await api.post("/notifications/read-all/");
    apply(0);
  }, [apply]);

  // Opening a page from a push notification (?n=<id>) marks that notification read.
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("n");
    if (!id || !/^\d+$/.test(id)) return;
    url.searchParams.delete("n");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    markRead(id);
  }, [pathname, markRead]);

  const value = useMemo(
    () => ({ unread, version, refresh, markRead, markAllRead }),
    [unread, version, refresh, markRead, markAllRead],
  );
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used inside <NotificationProvider>");
  return context;
}
