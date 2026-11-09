import { api } from "@/lib/api";

/** Web push helpers. Push needs a service worker, the Push API and (on iPhone/iPad) an installed app. */

export function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

/** "supported" | "install-first" (iOS, not installed) | "unsupported" */
export function pushSupport() {
  if (typeof window === "undefined") return "unsupported";
  const apis = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (apis) return "supported";
  if (isIos() && !isStandalone()) return "install-first";
  return "unsupported";
}

function keyToBytes(base64) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  return navigator.serviceWorker.ready;
}

export async function currentSubscription() {
  if (pushSupport() !== "supported") return null;
  const reg = await registration();
  return reg.pushManager.getSubscription();
}

/** Asks for permission (must be called from a click) and registers this device. */
export async function enablePush() {
  const { data } = await api.get("/notifications/push/public-key/");
  if (!data.enabled) throw new Error("Push notifications are not set up on the server yet.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notifications are blocked for this site. Allow them in your browser's site settings, then try again."
        : "Notification permission was not granted.",
    );
  }
  const reg = await registration();
  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(data.public_key) });
  }
  const json = subscription.toJSON();
  await api.post("/notifications/push/subscribe/", { endpoint: json.endpoint, keys: json.keys });
  return subscription;
}

/*
 * Push is on by default. Browsers only allow it after the person says yes once per device, so:
 * - permission already granted: this device is signed up again automatically at every sign-in;
 * - not decided yet: the app asks (a one-tap prompt), and asks again later if dismissed;
 * - turned off on the profile page: remembered on this device, and never switched back on by itself.
 */
const OPT_OUT_KEY = "sis.push.optOut";
const SNOOZE_KEY = "sis.push.askAfter";
const SNOOZE_DAYS = 3;

function stored(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Private browsing or blocked storage: the prompt may simply come back.
  }
}

export function pushOptedOut() {
  return stored(OPT_OUT_KEY) === "1";
}

export function setPushOptedOut(value) {
  store(OPT_OUT_KEY, value ? "1" : null);
}

export function pushPromptSnoozed() {
  return Number(stored(SNOOZE_KEY) || 0) > Date.now();
}

export function snoozePushPrompt() {
  store(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000));
}

/** Whether push is set up on the server at all (no keys: off for everyone). */
export async function pushAvailable() {
  try {
    const { data } = await api.get("/notifications/push/public-key/");
    return Boolean(data.enabled);
  } catch {
    return false;
  }
}

export async function disablePush() {
  const subscription = await currentSubscription();
  if (!subscription) return;
  try {
    await api.post("/notifications/push/unsubscribe/", { endpoint: subscription.endpoint });
  } finally {
    await subscription.unsubscribe();
  }
}

/** Signing out: stop this device receiving the previous user's notifications and clear the badge. */
export async function forgetDevice() {
  try {
    await disablePush();
  } catch {
    // The session may already have ended; the server prunes dead subscriptions.
  }
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR" });
  } catch {
    // ignore
  }
}

export function setBadge(count) {
  try {
    if (typeof navigator === "undefined" || !navigator.setAppBadge) return;
    const done = count > 0 ? navigator.setAppBadge(count) : navigator.clearAppBadge();
    done?.catch?.(() => {});
  } catch {
    // Badging is not available everywhere.
  }
}
