"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DropdownMenu, DropdownItem } from "@/components/ui/DropdownMenu";
import { useToast } from "@/components/ui/Toast";
import { signOutUser } from "@/lib/auth";

interface TopBarProps {
  pageTitle?: string;
}

export function TopBar({ pageTitle }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOutUser();
      document.cookie = "auth=; path=/; max-age=0";
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
      showToast({
        title: "Search coming soon",
        message: "For now, browse using the sidebar.",
        variant: "default"
      });
    }
  };

  return (
    <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 md:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold font-heading md:text-base">
          {computedTitle}
        </h1>
      </div>
      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="hidden max-w-xs flex-1 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted)] md:flex transition-all focus-within:border-amber-500/50 focus-within:shadow-[0_0_0_3px_rgba(217,119,6,0.1)]">
          <svg className="w-4 h-4 text-[var(--muted-2)] mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            placeholder="Search scholarships, applications, essays"
            className="h-6 w-full bg-transparent text-xs text-[var(--text)] placeholder:text-[var(--muted-2)] focus:outline-none"
            onKeyDown={handleSearchKeyDown}
            aria-label="Global search"
          />
        </div>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted)] hover:border-amber-500/50 hover:text-amber-400 transition-colors"
          aria-label="Notifications"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
        <DropdownMenu
          trigger={
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-black cursor-pointer">
              U
            </div>
          }
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
