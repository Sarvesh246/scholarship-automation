"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { useAdmin, getIdToken } from "@/hooks/useAdmin";

interface AdminStats {
  totalScholarships?: number;
  matchingHealth?: { matchablePercent?: number; averageQualityScore?: number | null };
  syncHistory?: { source: string; at?: { _seconds?: number } }[];
}

const adminSections = [
  {
    href: "/app/admin/dashboard",
    title: "Dashboard",
    description: "Total scholarships, by source/category, env check, sync history, recent errors.",
    icon: (
      <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: "/app/admin/scholarships",
    title: "Scholarships",
    description: "Add, edit, or remove scholarships. View and manage all scholarships in Firestore.",
    icon: (
      <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    href: "/app/admin/bulk",
    title: "Bulk import / export",
    description: "Import scholarships from JSON or CSV. Export for backup or analysis.",
    icon: (
      <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    href: "/app/admin/cleanup",
    title: "Cleanup",
    description: "Preview junk scholarships and run cleanup to remove them.",
    icon: (
      <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
  },
  {
    href: "/app/admin/data-quality",
    title: "Data quality",
    description: "Review queue (missing amount, short description) and duplicate detection.",
    icon: (
      <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/app/admin/users",
    title: "Users",
    description: "List users from Firebase Auth with basic stats.",
    icon: (
      <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    href: "/app/admin/feedback",
    title: "Feedback",
    description: "View user feedback on scholarships (bad or duplicate reports).",
    icon: (
      <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
  },
  {
    href: "/app/admin/sync",
    title: "Sync scholarships",
    description: "Run ScholarshipOwl, Grants.gov, or custom URL sync. Pull from APIs into Firestore.",
    icon: (
      <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    href: "/app/admin/scrape",
    title: "Scrape scholarships",
    description: "Scrape CollegeScholarships.org, Bold.org, Scholarships360, CollegeData, and more.",
    icon: (
      <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
];

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const { isAdmin } = useAdmin();

  useEffect(() => {
    if (!isAdmin) return;
    getIdToken().then((token) => {
      if (!token) return;
      fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => data && setStats(data))
        .catch(() => {});
    });
  }, [isAdmin]);

  const lastSync = stats?.syncHistory?.[0];
  const lastSyncTime = lastSync?.at && typeof lastSync.at === "object" && "_seconds" in lastSync
    ? new Date((lastSync.at as { _seconds: number })._seconds * 1000).toLocaleString()
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        subtitle="Manage scholarships and run syncs from the website."
      />
      {stats && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
          <span className="font-medium text-[var(--text)]">
            <span className="text-[var(--muted)]">Total scholarships:</span> {stats.totalScholarships ?? "—"}
          </span>
          {stats.matchingHealth != null && (
            <>
              <span className="font-medium text-[var(--text)]">
                <span className="text-[var(--muted)]">% matchable:</span> {stats.matchingHealth.matchablePercent ?? "—"}%
              </span>
              <span className="font-medium text-[var(--text)]">
                <span className="text-[var(--muted)]">Avg quality score:</span> {stats.matchingHealth.averageQualityScore ?? "—"}
              </span>
            </>
          )}
          {lastSyncTime && (
            <span className="text-[var(--muted-2)]">
              Last sync: {lastSync?.source ?? "—"} at {lastSyncTime}
            </span>
          )}
          <Link href="/app/admin/dashboard" className="text-amber-400 hover:underline text-xs font-medium">
            View full dashboard →
          </Link>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminSections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="flex h-full flex-col gap-3 p-5 transition-all hover:border-amber-500/30 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                {section.icon}
              </div>
              <div>
                <h2 className="font-semibold font-heading text-[var(--text)]">{section.title}</h2>
                <p className="mt-1 text-xs text-[var(--muted)]">{section.description}</p>
              </div>
              <span className="mt-auto text-xs font-medium text-amber-400">Open →</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
