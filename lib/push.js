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
