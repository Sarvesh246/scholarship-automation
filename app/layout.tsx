import type { Metadata, Viewport } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { FirebaseAnalyticsInit } from "@/components/FirebaseAnalyticsInit";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"]
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["400", "500", "600", "700"]
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08080c"
};

export const metadata: Metadata = {
  title: {
    default: "ApplyPilot - Your Scholarship Co-Pilot",
    template: "%s | ApplyPilot"
  },
  description: "A calm, structured workspace to discover scholarships, track applications, and land funding.",
  keywords: ["scholarships", "college funding", "applications", "financial aid", "scholarship tracker"],
  openGraph: {
    title: "ApplyPilot - Your Scholarship Co-Pilot",
    description: "A calm, structured workspace to discover scholarships, track applications, and land funding.",
    type: "website",
    siteName: "ApplyPilot"
  },
  twitter: {
    card: "summary_large_image",
    title: "ApplyPilot - Your Scholarship Co-Pilot",
    description: "A calm, structured workspace to discover scholarships, track applications, and land funding."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" data-app-version="firestore-2025-03" className={`${dmSans.variable} ${spaceGrotesk.variable}`}>
      <body>
        <ToastProvider>
          <FirebaseAnalyticsInit />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
