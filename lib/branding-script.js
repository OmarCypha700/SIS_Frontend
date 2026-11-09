/** Shared by the root layout (server) and lib/branding-client.js (browser). */
export const BRANDING_KEY = "sis.branding";

/**
 * Runs inline at the top of every page, before anything is drawn: applies the brand colour saved on
 * this device and starts loading the saved logo. Kept tiny and defensive: it must never stop the
 * page from loading.
 */
export const BRANDING_SCRIPT = `try{var b=JSON.parse(localStorage.getItem("${BRANDING_KEY}")||"null");if(b){var s=document.documentElement.style;if(b.primary_color){s.setProperty("--primary",b.primary_color);s.setProperty("--sidebar-primary",b.primary_color);s.setProperty("--ring",b.primary_color)}if(b.logo){var l=document.createElement("link");l.rel="preload";l.as="image";l.href=b.logo;l.fetchPriority="high";document.head.appendChild(l)}}}catch(e){}`;
