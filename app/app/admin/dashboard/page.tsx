"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAdmin, getIdToken } from "@/hooks/useAdmin";

interface MatchingHealth {
  matchablePercent: number;
  missingStructuredEligibilityPercent: number;
  missingGPAPercent: number;
  missingStateEligibilityPercent: number;
  averageQualityScore: number | null;
  matchableCount: number;
  totalScholarships: number;
}

interface Stats {
  totalScholarships: number;
  expiredCount: number;
  junkCount: number;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
  byDeadline: { next7: number; next30: number; next90: number; later: number };
  applicationsCount: number;
  essaysCount: number;
  totalUsers?: number;
  matchingHealth?: MatchingHealth;
  syncHistory: { source: string; created: number; updated: number; at?: { _seconds?: number }; errors?: string[] }[];
  errors: { source: string; message: string; at?: { _seconds?: number } }[];
  envVars: { key: string; set: boolean }[];
}

export default function AdminDashboardPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadStats();
  }, [isAdmin, loadStats]);

  useEffect(() => {
    if (!isAdmin) return;
    const interval = setInterval(loadStats, 60_000);
    return () => clearInterval(interval);
  }, [isAdmin, loadStats]);

  if (adminLoading || !isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin dashboard" />
        {!isAdmin && <p className="text-sm text-[var(--muted)]">You don&apos;t have permission to access this page.</p>}
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin dashboard" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const formatTime = (t?: { _seconds?: number; seconds?: number }) => {
    const sec = t?._seconds ?? t?.seconds;
    return sec ? new Date(sec * 1000).toLocaleString() : "—";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin dashboard"
        subtitle="Overview of scholarships, users, and system status. Stats refresh every 60s."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-[var(--muted-2)]">Total scholarships</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">{stats.totalScholarships}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--muted-2)]">Total users</p>
          <p className="mt-1 text-2xl font-bold">{stats.totalUsers ?? "—"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--muted-2)]">Total applications</p>
          <p className="mt-1 text-2xl font-bold">{stats.applicationsCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--muted-2)]">Total essays</p>
          <p className="mt-1 text-2xl font-bold">{stats.essaysCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--muted-2)]">Expired (in DB)</p>
          <p className="mt-1 text-2xl font-bold">{stats.expiredCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--muted-2)]">Junk (to cleanup)</p>
          <p className="mt-1 text-2xl font-bold">{stats.junkCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--muted-2)]">Deadlines next 7 days</p>
          <p className="mt-1 text-2xl font-bold">{stats.byDeadline.next7}</p>
        </Card>
      </div>

      {stats.matchingHealth && (
        <Card className="p-4 border-emerald-500/20">
          <h3 className="text-sm font-semibold text-[var(--text)]">Matching health</h3>
          <p className="text-xs text-[var(--muted-2)] mt-0.5">Quality of normalized data for Greenlight matching. Run full validation to improve.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-[10px] text-[var(--muted-2)]">% matchable</p>
              <p className="text-lg font-bold text-emerald-400">{stats.matchingHealth.matchablePercent}%</p>
              <p className="text-[10px] text-[var(--muted-2)]">{stats.matchingHealth.matchableCount} / {stats.matchingHealth.totalScholarships}</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--muted-2)]">% missing eligibility</p>
              <p className="text-lg font-bold">{stats.matchingHealth.missingStructuredEligibilityPercent}%</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--muted-2)]">% missing GPA data</p>
              <p className="text-lg font-bold">{stats.matchingHealth.missingGPAPercent}%</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--muted-2)]">% missing state eligibility</p>
              <p className="text-lg font-bold">{stats.matchingHealth.missingStateEligibilityPercent}%</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--muted-2)]">Avg quality score</p>
              <p className="text-lg font-bold">{stats.matchingHealth.averageQualityScore ?? "—"}</p>
            </div>
          </div>
          <Link href="/app/admin/sync#validation" className="inline-block mt-3">
            <Button type="button" variant="secondary" size="sm">Run full validation</Button>
          </Link>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-[var(--text)]">By source</h3>
          <div className="mt-2 space-y-1 text-xs">
            {Object.entries(stats.bySource)
              .sort(([, a], [, b]) => b - a)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-[var(--muted)]">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-[var(--text)]">By category</h3>
          <div className="mt-2 space-y-1 text-xs">
            {Object.entries(stats.byCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-[var(--muted)]">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-[var(--text)]">Environment</h3>
          <div className="mt-2 space-y-1 text-xs">
            {stats.envVars.map(({ key, set }) => (
              <div key={key} className="flex justify-between">
                <span className="text-[var(--muted)]">{key}</span>
                <span className={set ? "text-emerald-400" : "text-red-400"}>{set ? "Set" : "Not set"}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-[var(--text)]">Recent syncs</h3>
          <div className="mt-2 max-h-40 overflow-y-auto space-y-2 text-xs">
            {stats.syncHistory.length === 0 ? (
              <p className="text-[var(--muted)]">No sync history yet.</p>
            ) : (
              stats.syncHistory.slice(0, 10).map((h, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span className="text-[var(--muted)]">{h.source}</span>
                  <span>+{h.created} / ~{h.updated}</span>
                  <span className="text-[10px] text-[var(--muted-2)]">{formatTime(h.at as { _seconds?: number })}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {stats.errors.length > 0 && (
        <Card className="p-4 border-red-500/20">
          <h3 className="text-sm font-semibold text-red-400">Recent errors</h3>
          <div className="mt-2 max-h-32 overflow-y-auto space-y-2 text-xs">
            {stats.errors.slice(0, 5).map((e, i) => (
              <div key={i} className="text-[var(--muted)]">
                <span className="text-red-400">{e.source}:</span> {e.message}
              </div>
            ))}
          </div>
          <Link href="/app/admin/cleanup">
            <Button type="button" variant="secondary" size="sm" className="mt-3">
              View cleanup
            </Button>
          </Link>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href="/app/admin/sync">
          <Button type="button" variant="primary">Run sync</Button>
        </Link>
        <Link href="/app/admin/sync#validation">
          <Button type="button" variant="secondary">Run full validation</Button>
        </Link>
        <Link href="/app/admin/scrape">
          <Button type="button" variant="secondary">Run scrape</Button>
        </Link>
        <Link href="/app/admin/cleanup">
          <Button type="button" variant="secondary">Cleanup</Button>
        </Link>
        <Link href="/app/admin/scholarships">
          <Button type="button" variant="secondary">Manage scholarships</Button>
        </Link>
      </div>
    </div>
  );
}
