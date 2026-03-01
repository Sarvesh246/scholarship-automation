import { ReactNode } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-[var(--bg)] px-4 py-8 relative overflow-hidden">
      <div className="gradient-orb orb-gold" style={{ top: "-300px", right: "-200px" }} />
      <div className="gradient-orb orb-blue" style={{ bottom: "-200px", left: "-200px" }} />

      <header className="mx-auto flex w-full max-w-md items-center justify-between pb-10 relative z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-md">
            <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </div>
          <span className="text-sm font-bold font-heading text-[var(--text)]">
            ApplyPilot
          </span>
        </Link>
      </header>
      <div className="flex flex-1 items-start justify-center relative z-10">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg">
          {children}
        </div>
      </div>
    </main>
  );
}
