import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { Providers } from "@/components/providers";
import { BRANDING_SCRIPT } from "@/lib/branding-script";

import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const appIcon = (size, purpose = "any") => `/api/v1/institution/app-icon/?size=${size}&purpose=${purpose}`;

// iPhone and iPad screens (CSS width × height at a pixel ratio): each gets an opening screen with the
// institution's logo and name, drawn by the backend at the exact size, instead of a blank white screen.
const APPLE_SCREENS = [
  [320, 568, 2], [375, 667, 2], [414, 896, 2], [375, 812, 3], [414, 736, 3], [414, 896, 3], [390, 844, 3], [393, 852, 3],
  [402, 874, 3], [428, 926, 3], [430, 932, 3], [440, 956, 3], [768, 1024, 2], [810, 1080, 2], [820, 1180, 2],
  [834, 1194, 2], [1024, 1366, 2],
];

export const metadata = {
  title: { default: "Student Information System", template: "%s · SIS" },
  description: "Student records, course registration and results management.",
  // iPhone/iPad: full-screen when added to the Home Screen, with the institution's icon and opening screen.
  // No fixed title here: the Home Screen name then comes from the manifest ("<short name> Portal").
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    startupImage: APPLE_SCREENS.map(([width, height, ratio]) => ({
      url: `/api/v1/institution/app-splash/?width=${width * ratio}&height=${height * ratio}`,
      media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`,
    })),
  },
  // The browser-tab icon is the institution's logo too (see also the /favicon.ico rewrite).
  icons: {
    icon: [
      { url: appIcon(32), sizes: "32x32", type: "image/png" },
      { url: appIcon(48), sizes: "48x48", type: "image/png" },
      { url: appIcon(192), sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: appIcon(180, "maskable"), sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {/* Before anything is drawn: the saved brand colour, and the logo starts loading (lib/branding-client.js). */}
        <Script id="branding" strategy="beforeInteractive">{BRANDING_SCRIPT}</Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
