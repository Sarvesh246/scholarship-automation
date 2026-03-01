import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { FirebaseAnalyticsInit } from "@/components/FirebaseAnalyticsInit";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"]
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: "ApplyPilot - Your Scholarship Co-Pilot",
  description: "A calm, structured workspace to discover scholarships, track applications, and land funding."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${dmSans.variable} ${spaceGrotesk.variable}`}>
      <body>
        <ToastProvider>
          <FirebaseAnalyticsInit />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
