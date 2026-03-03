"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./navItems";
import { useUser } from "@/hooks/useUser";
import { useAdmin } from "@/hooks/useAdmin";
import { useState, useEffect } from "react";
import { getApplications } from "@/lib/applicationStorage";
import { getScholarships } from "@/lib/scholarshipStorage";

export function SidebarNav() {
  const pathname = usePathname();
  const { displayName, email, initials } = useUser();
  const { isAdmin } = useAdmin();
  const [counts, setCounts] = useState<{ applications: number; deadlinesSoon: number }>({ applications: 0, deadlinesSoon: 0 });

  useEffect(() => {
    let cancelled = false;
    Promise.all([getApplications(), getScholarships()]).then(([apps, schols]) => {
      if (cancelled) return;
      const now = new Date();
      const in7 = new Date(now);
      in7.setDate(now.getDate() + 7);
      let soon = 0;
      for (const app of apps) {
        const s = schols.find((sch) => sch.id === app.scholarshipId);
        if (s?.deadline) {
          const d = new Date(s.deadline);
          if (d >= now && d <= in7) soon++;
        }
      }
      setCounts({ applications: apps.length, deadlinesSoon: soon });
    });
    return () => { cancelled = true; };
  }, []);

  const getBadge = (href: string): number | undefined => {
    if (href === "/app/applications") return counts.applications;
    if (href === "/app/deadlines") return counts.deadlinesSoon;
    return undefined;
  };

  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-4 md:flex md:flex-col">
      <div className="flex items-center gap-2 px-2 pb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-amber-500 to-orange-600 shadow-md shrink-0">
          <svg className="w-[18px] h-[18px] text-[var(--on-primary)] translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold font-heading tracking-tight">
            ApplyPilot
          </span>
          <span className="text-[10px] text-[var(--muted-2)]">
            Your scholarship co-pilot
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
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)]",
                active &&
                  "bg-[var(--primary-soft)] text-amber-400 hover:bg-[var(--primary-soft)] hover:text-amber-400"
              )}
            >
              {active && (
                <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-amber-500" />
              )}
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {(() => { const b = getBadge(item.href); return b != null && b > 0 ? (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500/20 px-1.5 text-[10px] font-semibold text-amber-400">
                  {b > 99 ? "99+" : b}
                </span>
              ) : null; })()}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/app/admin"
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)]",
              pathname?.startsWith("/app/admin") &&
                "bg-[var(--primary-soft)] text-amber-400 hover:bg-[var(--primary-soft)] hover:text-amber-400"
            )}
          >
            {pathname?.startsWith("/app/admin") && (
              <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-amber-500" />
            )}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Admin</span>
          </Link>
        )}
      </nav>

      <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4 text-xs">
        <div className="flex items-center justify-between rounded-lg bg-[var(--surface)] px-3 py-2">
          <span className="text-[var(--muted-2)]">Plan</span>
          <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
            Free
          </span>
        </div>
        <button
          type="button"
          className="w-full rounded-lg border border-dashed border-[var(--border)] px-3 py-1.5 text-[11px] text-[var(--muted)] hover:border-amber-500/50 hover:text-amber-400 transition-colors"
        >
          Upgrade (soon)
        </button>
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-orange-500 text-[10px] font-bold text-[var(--on-primary)] shrink-0">
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate text-[11px] font-medium">
              {displayName || "Student"}
            </span>
            <span className="truncate text-[10px] text-[var(--muted-2)]">
              {email || "Student account"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
