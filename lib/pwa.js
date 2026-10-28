"use client";

import { useSyncExternalStore } from "react";

/*
 * Browser-only PWA state kept outside React (so it survives navigation) and read with
 * useSyncExternalStore, which renders the server value first and avoids hydration mismatches.
 */

let installEvent = null;
let installed = false;
const listeners = new Set();
const emit = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // show our own "Install app" item instead of the mini-infobar
    installEvent = event;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    installed = true;
    emit();
  });
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Offers the browser's install dialog when it is available (Chrome, Edge, Android). */
export function useInstallPrompt() {
  const canInstall = useSyncExternalStore(subscribe, () => Boolean(installEvent) && !installed, () => false);
  async function install() {
    if (!installEvent) return false;
    installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    installEvent = null;
    emit();
    return outcome === "accepted";
  }
  return { canInstall, install };
}

function subscribeOnline(listener) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

function subscribeDisplay(listener) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

export function useStandalone() {
  return useSyncExternalStore(
    subscribeDisplay,
    () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true,
    () => false,
  );
}
