"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DropdownMenu, DropdownItem } from "@/components/ui/DropdownMenu";
import { useToast } from "@/components/ui/Toast";
import { signOutUser } from "@/lib/auth";
import { clearAuthCookie } from "@/lib/cookie";
import { useUser } from "@/hooks/useUser";
import { useNotifications } from "@/hooks/useNotifications";

interface TopBarProps {
  pageTitle?: string;
  onMobileMenuToggle?: () => void;
}

export function TopBar({ pageTitle, onMobileMenuToggle }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const { showToast } = useToast();
  const { initials } = useUser();
  const { items: notifications, loading: notificationsLoading, refresh: refreshNotifications, unreadCount, markAllAsRead } = useNotifications();

  const handleSignOut = async () => {
    try {
      await signOutUser();
      clearAuthCookie();
      router.push("/auth/sign-in");
      showToast({ title: "Signed out", variant: "default" });
    } catch {
      showToast({
        title: "Sign out failed",
        message: "Please try again.",
        variant: "danger"
      });
    }
  };

  const computedTitle = (() => {
    if (pageTitle) return pageTitle;
    if (!pathname) return "Dashboard";
    if (pathname.startsWith("/app/dashboard")) return "Dashboard";
    if (pathname.startsWith("/app/scholarships")) return "Scholarships";
    if (pathname.startsWith("/app/applications")) return "Applications";
    if (pathname.startsWith("/app/essays")) return "Essays";
    if (pathname.startsWith("/app/deadlines")) return "Deadlines";
    if (pathname.startsWith("/app/profile")) return "Profile";
    if (pathname.startsWith("/app/settings")) return "Settings";
    return "Workspace";
  })();

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const q = searchValue.trim();
      if (q) {
        router.push(`/app/scholarships?q=${encodeURIComponent(q)}`);
        setSearchValue("");
      } else {
        router.push("/app/scholarships");
      }
    }
  };

  return (
    <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 md:px-6">
      <div className="flex items-center gap-3 min-w-0">
        {onMobileMenuToggle && (
          <button
            type="button"
            onClick={onMobileMenuToggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--text)] transition-colors md:hidden"
            aria-label="Open navigation menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <h1 className="truncate text-sm font-semibold font-heading md:text-base">
          {computedTitle}
        </h1>
      </div>
      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="hidden max-w-xs flex-1 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted)] md:flex transition-all focus-within:border-amber-500/50 focus-within:shadow-[0_0_0_3px_rgba(217,119,6,0.1)]">
          <svg className="w-4 h-4 text-[var(--muted-2)] mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            placeholder="Search scholarships (press Enter)"
            className="h-6 w-full bg-transparent text-xs text-[var(--text)] placeholder:text-[var(--muted-2)] focus:outline-none"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            aria-label="Search scholarships"
          />
        </div>
        <DropdownMenu
          trigger={
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] hover:border-amber-500/50 hover:text-amber-400 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
          }
          align="end"
          contentClassName="min-w-[280px] p-0"
          ariaLabel="Notifications"
          onOpenChange={(open) => { if (!open) markAllAsRead(); }}
        >
          <div className="max-h-[280px] min-w-[260px] overflow-hidden">
            <div className="border-b border-[var(--border)] px-3 py-2 flex items-center justify-between">
              <span className="font-medium text-[var(--text)]">Notifications</span>
              <button
                type="button"
                onClick={() => refreshNotifications()}
                className="text-[10px] text-amber-400 hover:underline"
              >
                Refresh
              </button>
            </div>
            <div className="max-h-[220px] overflow-y-auto">
              {notificationsLoading ? (
                <div className="px-3 py-4 text-center text-xs text-[var(--muted)]">Loading…</div>
              ) : notifications.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-[var(--muted)]">
                  You&apos;re all caught up. No action needed right now.
                </div>
              ) : (
                notifications.map((n) => (
                  <DropdownItem
                    key={n.id}
                    onSelect={() => n.href && router.push(n.href)}
                  >
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-medium text-[var(--text)] truncate w-full">{n.title}</span>
                      <span className="text-[var(--muted)]">{n.message}</span>
                    </div>
                  </DropdownItem>
                ))
              )}
            </div>
            {!notificationsLoading && notifications.length > 0 && (
              <div className="border-t border-[var(--border)] p-1">
                <DropdownItem onSelect={() => router.push("/app/applications")}>
                  View applications
                </DropdownItem>
              </div>
            )}
          </div>
        </DropdownMenu>
        <DropdownMenu
          trigger={
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-orange-500 text-xs font-bold text-black cursor-pointer">
              {initials}
            </div>
          }
          ariaLabel="User menu"
        >
          <DropdownItem onSelect={() => router.push("/app/profile")}>
            Profile
          </DropdownItem>
          <DropdownItem onSelect={() => router.push("/app/settings")}>
            Settings
          </DropdownItem>
          <DropdownItem danger onSelect={handleSignOut}>
            Sign out
          </DropdownItem>
        </DropdownMenu>
      </div>
    </header>
  );
}
