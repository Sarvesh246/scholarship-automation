"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/scholarships", label: "Scholarships" },
  { href: "/app/applications", label: "Applications" },
  { href: "/app/essays", label: "Essays" },
  { href: "/app/deadlines", label: "Deadlines" },
  { href: "/app/profile", label: "Profile" },
  { href: "/app/settings", label: "Settings" }
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] px-4 py-4 md:flex md:flex-col">
      <div className="flex items-center gap-2 px-2 pb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--primary-soft)] text-sm font-semibold text-[var(--primary)] shadow-sm">
          SW
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold tracking-tight">
            Scholarship Workflow
          </span>
          <span className="text-[10px] text-[var(--muted-2)]">
            Calm application pipeline
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 text-sm">
        {navItems.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-2 rounded-md px-3 py-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
                active &&
                  "bg-[var(--primary-soft)] text-[var(--primary)] hover:bg-[var(--primary-soft)]"
              )}
            >
              {active && (
                <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[var(--primary)]" />
              )}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4 text-xs">
        <div className="flex items-center justify-between rounded-md bg-[var(--surface-2)] px-3 py-2">
          <span className="text-[var(--muted-2)]">Plan</span>
          <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
            Free
          </span>
        </div>
        <button
          type="button"
          className="w-full rounded-md border border-dashed border-[var(--border)] px-3 py-1.5 text-[11px] text-[var(--muted)] hover:border-[var(--text)] hover:text-[var(--text)]"
        >
          Upgrade (soon)
        </button>
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-2)] text-[10px] font-medium text-[var(--muted)]">
            U
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-medium">You</span>
            <span className="text-[10px] text-[var(--muted-2)]">
              Student account
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

