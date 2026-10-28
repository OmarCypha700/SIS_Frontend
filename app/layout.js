import { Geist, Geist_Mono } from "next/font/google";

import { Providers } from "@/components/providers";

import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: { default: "Student Information System", template: "%s · SIS" },
  description: "Student records, course registration and results management.",
  applicationName: "Student Portal",
  // iPhone/iPad: full-screen when added to the Home Screen, with the institution's icon.
  appleWebApp: { capable: true, title: "Student Portal", statusBarStyle: "default" },
  icons: { apple: [{ url: "/api/v1/institution/app-icon/?size=180&purpose=maskable", sizes: "180x180" }] },
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
