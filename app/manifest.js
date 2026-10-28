const backendUrl = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

const FALLBACK = { name: "Student Information System", short_name: "SIS", primary_color: "#1d4ed8" };

async function branding() {
  try {
    const response = await fetch(`${backendUrl}/api/v1/institution/`, { headers: { Accept: "application/json" } });
    return response.ok ? { ...FALLBACK, ...(await response.json()) } : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

function icon(size, purpose = "any") {
  return { src: `/api/v1/institution/app-icon/?size=${size}&purpose=${purpose}`, sizes: `${size}x${size}`, type: "image/png", purpose };
}

/** Web app manifest: makes the portal installable, branded with the institution's name, colour and logo. */
export default async function manifest() {
  const { name, short_name: shortName, primary_color: colour } = await branding();
  const shortcut = (label, url) => ({ name: label, short_name: label, url, icons: [icon(96)] });
  return {
    id: "/",
    name: `${name} – Student Portal`,
    short_name: shortName,
    description: "Student records, course registration and results.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "any",
    background_color: "#ffffff",
    theme_color: colour,
    categories: ["education", "productivity"],
    icons: [icon(192), icon(512), icon(192, "maskable"), icon(512, "maskable")],
    shortcuts: [
      shortcut("Dashboard", "/dashboard"),
      shortcut("Notifications", "/notifications"),
      shortcut("My results", "/my-results"),
      shortcut("Results to review", "/results/sheets"),
    ],
  };
}
