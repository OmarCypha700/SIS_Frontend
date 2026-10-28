/**
 * In-app notification sound. Browsers block audio until the person has interacted with the page,
 * so the sound is "unlocked" on the first click or key press. Push notifications that arrive while
 * the app is closed use the device's own notification sound (browsers do not allow custom ones).
 */
export const NOTIFICATION_SOUND = "/sounds/notification.wav";
const MIN_GAP_MS = 3000;

let audio = null;
let lastPlayed = 0;
let unlocked = false;

function element() {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio(NOTIFICATION_SOUND);
    audio.preload = "auto";
    audio.volume = 0.7;
  }
  return audio;
}

/** Call once on the client: prepares the sound on the first user interaction. */
export function unlockSoundOnInteraction() {
  if (typeof window === "undefined" || unlocked) return () => {};
  const unlock = () => {
    const a = element();
    if (!a) return;
    a.muted = true;
    a.play()
      .then(() => {
        a.pause();
        a.currentTime = 0;
        a.muted = false;
        unlocked = true;
      })
      .catch(() => {
        a.muted = false;
      });
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
}

/** Plays the sound, at most once every few seconds. `force` ignores the gap (for the preview button). */
export function playNotificationSound({ force = false } = {}) {
  const a = element();
  if (!a) return Promise.resolve(false);
  const now = Date.now();
  if (!force && now - lastPlayed < MIN_GAP_MS) return Promise.resolve(false);
  lastPlayed = now;
  a.currentTime = 0;
  return a.play().then(
    () => true,
    () => false,
  );
}
