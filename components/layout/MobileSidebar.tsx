"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./navItems";
import { useAdmin } from "@/hooks/useAdmin";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const { isAdmin } = useAdmin();

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-[var(--overlay)] transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] px-4 py-4 transition-transform duration-200 ease-in-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-between pb-6">
          <div className="flex items-center gap-2 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-amber-500 to-orange-600 shadow-md shrink-0">
              <svg className="w-[18px] h-[18px] text-[var(--on-primary)] translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold font-heading tracking-tight">ApplyPilot</span>
              <span className="text-[10px] text-[var(--muted-2)]">Your scholarship co-pilot</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            aria-label="Close navigation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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
                    "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] hover:bg-[var(--nav-active-bg)] hover:text-[var(--nav-active-text)]"
                )}
              >
                {active && (
                  <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[var(--nav-active-border)]" />
                )}
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/app/admin/scholarships"
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)]",
                pathname?.startsWith("/app/admin") &&
                  "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] hover:bg-[var(--nav-active-bg)] hover:text-[var(--nav-active-text)]"
              )}
            >
              {pathname?.startsWith("/app/admin") && (
                <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[var(--nav-active-border)]" />
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
            <span className="rounded-full bg-[var(--nav-active-bg)] border border-[var(--primary)]/20 px-2 py-0.5 text-[10px] font-medium text-[var(--nav-active-text)]">
              Free
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
