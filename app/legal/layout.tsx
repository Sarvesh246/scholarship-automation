import Link from "next/link";
import { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--nav-glass-bg)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-[var(--text)] hover:opacity-90 transition-opacity"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary)]">
              <svg className="h-3.5 w-3.5 text-[var(--on-primary)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </div>
            <span className="font-bold font-heading">ApplyPilot</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/legal/privacy" className="text-[var(--muted)] hover:text-[var(--text)] transition-colors">Privacy</Link>
            <Link href="/legal/terms" className="text-[var(--muted)] hover:text-[var(--text)] transition-colors">Terms</Link>
            <Link href="/legal/cookies" className="text-[var(--muted)] hover:text-[var(--text)] transition-colors">Cookies</Link>
            <Link href="/" className="text-[var(--muted)] hover:text-[var(--text)] transition-colors">Home</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
      <footer className="border-t border-[var(--border)] py-6">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-[var(--muted-2)]">
          <p>&copy; {new Date().getFullYear()} ApplyPilot. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/legal/privacy" className="hover:text-[var(--text)] transition-colors">Privacy Policy</Link>
            <Link href="/legal/terms" className="hover:text-[var(--text)] transition-colors">Terms of Service</Link>
            <Link href="/legal/cookies" className="hover:text-[var(--text)] transition-colors">Cookie Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
