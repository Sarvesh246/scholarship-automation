import type { Metadata } from "next";
import "./globals.css";
import { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Scholarship Workflow",
  description: "Calm, structured scholarship application workflow manager."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var stored = localStorage.getItem('theme');
                var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                var theme = stored === 'light' || stored === 'dark' ? stored : (prefersDark ? 'dark' : 'light');
                if (theme === 'dark') document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
              })();
            `
          }}
        />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}


