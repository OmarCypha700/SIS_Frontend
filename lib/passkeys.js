import { api, ensureCsrf } from "@/lib/api";

/**
 * Passkeys: signing in with the device's fingerprint, face or PIN (WebAuthn). The browser and the
 * device do the biometric check; the server only ever sees a signature and a public key.
 * The server sends options and checks answers as JSON with binary fields in base64url.
 */

function toBytes(base64url) {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (base64url.length % 4)) % 4);
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function toBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Whether this device can use a built-in fingerprint, face or PIN for passkeys. */
export async function passkeysAvailable() {
  try {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function friendlyError(error) {
  if (error?.response) return error; // the server's own message
  const name = error?.name;
  if (name === "NotAllowedError") return new Error("Cancelled, or the device did not confirm it was you.");
  if (name === "InvalidStateError") return new Error("This device already has a passkey for your account.");
  if (name === "SecurityError") return new Error("Passkeys only work on the portal's secure (https) address.");
  return new Error("This device could not use a passkey.");
}

/** Set up a passkey on this device for the signed-in person. Returns the saved passkey. */
export async function createPasskey(name) {
  try {
    const { data: options } = await api.post("/auth/passkeys/register/options/");
    const credential = await navigator.credentials.create({
      publicKey: {
        ...options,
        challenge: toBytes(options.challenge),
        user: { ...options.user, id: toBytes(options.user.id) },
        excludeCredentials: (options.excludeCredentials || []).map((c) => ({ ...c, id: toBytes(c.id) })),
      },
    });
    const body = {
      id: credential.id,
      rawId: toBase64url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: toBase64url(credential.response.clientDataJSON),
        attestationObject: toBase64url(credential.response.attestationObject),
        transports: credential.response.getTransports?.() || [],
      },
      clientExtensionResults: credential.getClientExtensionResults?.() || {},
      authenticatorAttachment: credential.authenticatorAttachment,
    };
    const { data } = await api.post("/auth/passkeys/register/", { credential: body, name });
    return data;
  } catch (error) {
    throw friendlyError(error);
  }
}

/** Sign in with a passkey on this device: no email or password. Returns the signed-in user. */
export async function signInWithPasskey() {
  try {
    await ensureCsrf();
    const { data: options } = await api.post("/auth/passkeys/sign-in/options/");
    const credential = await navigator.credentials.get({
      publicKey: {
        ...options,
        challenge: toBytes(options.challenge),
        allowCredentials: (options.allowCredentials || []).map((c) => ({ ...c, id: toBytes(c.id) })),
      },
    });
    const body = {
      id: credential.id,
      rawId: toBase64url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: toBase64url(credential.response.clientDataJSON),
        authenticatorData: toBase64url(credential.response.authenticatorData),
        signature: toBase64url(credential.response.signature),
        userHandle: credential.response.userHandle ? toBase64url(credential.response.userHandle) : null,
      },
      clientExtensionResults: credential.getClientExtensionResults?.() || {},
      authenticatorAttachment: credential.authenticatorAttachment,
    };
    const { data } = await api.post("/auth/passkeys/sign-in/", { credential: body });
    return data;
  } catch (error) {
    throw friendlyError(error);
  }
}

/** A short name for this device, suggested when setting up a passkey. */
export function deviceName() {
  if (typeof navigator === "undefined") return "This device";
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "iPad";
  if (/Android/.test(ua)) return "Android phone";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows computer";
  return "This device";
}
