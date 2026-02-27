"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DropdownMenu, DropdownItem } from "@/components/ui/DropdownMenu";
import { Switch } from "@/components/ui/Switch";
import { getInitialTheme, setTheme } from "@/lib/theme";
import { useToast } from "@/components/ui/Toast";
import { signOutUser } from "@/lib/auth";

interface TopBarProps {
  pageTitle?: string;
}

export function TopBar({ pageTitle }: TopBarProps) {
  const pathname = usePathname();
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    setThemeState(getInitialTheme());
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    setThemeState(next);
  };

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
    <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 md:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold md:text-base">
          {computedTitle}
        </h1>
      </div>
      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="hidden max-w-xs flex-1 items-center rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--muted)] md:flex">
          <input
            placeholder="Search scholarships, applications, essays"
            className="h-6 w-full bg-transparent text-xs text-[var(--text)] placeholder:text-[var(--muted-2)] focus:outline-none"
            onKeyDown={handleSearchKeyDown}
            aria-label="Global search"
          />
        </div>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] hover:border-[var(--text)] hover:text-[var(--text)]"
          aria-label="Notifications"
        >
          •
        </button>
        <div className="flex items-center gap-2">
          <Switch
            checked={theme === "dark"}
            aria-label="Toggle dark mode"
            onClick={toggleTheme}
          />
        </div>
        <DropdownMenu
          trigger={
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-medium text-[var(--muted)]">
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

