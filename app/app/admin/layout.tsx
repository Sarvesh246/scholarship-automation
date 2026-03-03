"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdmin } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";

const adminNavItems: { href: string; label: string }[] = [
  { href: "/app/admin", label: "Admin home" },
  { href: "/app/admin/dashboard", label: "Dashboard" },
  { href: "/app/admin/scholarships", label: "Scholarships" },
  { href: "/app/admin/bulk", label: "Bulk" },
  { href: "/app/admin/cleanup", label: "Cleanup" },
  { href: "/app/admin/data-quality", label: "Data quality" },
  { href: "/app/admin/users", label: "Users" },
  { href: "/app/admin/feedback", label: "Feedback" },
  { href: "/app/admin/sync", label: "Sync" },
  { href: "/app/admin/scrape", label: "Scrape" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isAdmin, loading } = useAdmin();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--surface-2)]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-lg font-semibold font-heading">Admin</h1>
        <p className="text-sm text-[var(--muted)]">
          You don&apos;t have permission to access this area. Add your email to ADMIN_EMAILS in the server environment to grant access.
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <nav className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-4">
        {adminNavItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/app/admin" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] border border-transparent"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
