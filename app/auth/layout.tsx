import { ReactNode } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-[var(--bg)] px-4 py-8">
      <header className="mx-auto flex w-full max-w-md items-center justify-between pb-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--primary-soft)] text-sm font-semibold text-[var(--primary)] shadow-sm">
            SW
          </div>
          <span className="text-sm font-medium text-[var(--muted)]">
            Scholarship Workflow
          </span>
        </Link>
      </header>
      <div className="flex flex-1 items-start justify-center">
        <div className="w-full max-w-md rounded-md border border-[var(--border)] bg-[var(--surface)] p-6 shadow-md">
          {children}
        </div>
      </div>
    </main>
  );
}

