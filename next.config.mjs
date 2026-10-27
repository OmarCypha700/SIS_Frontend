/**
 * The browser only ever talks to this Next.js origin. Requests to /api/* and /media/*
 * are proxied to Django, so Django's session and CSRF cookies are first-party cookies
 * on the frontend domain (no cross-site cookies, no tokens in localStorage).
 */
const backendUrl = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets end-to-end tests build into a separate folder without disturbing `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  // Django URLs end with "/"; keep them exactly as written instead of redirecting.
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      { source: "/api/:path*/", destination: `${backendUrl}/api/:path*/` },
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/media/:path*", destination: `${backendUrl}/media/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
