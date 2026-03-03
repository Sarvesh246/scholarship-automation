"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useAdmin, getIdToken } from "@/hooks/useAdmin";
import { SCRAPERS, type ScraperId } from "@/lib/scrapers";

const SCRAPER_IDS = Object.keys(SCRAPERS) as ScraperId[];

export default function AdminScrapePage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { showToast } = useToast();
  const [scraping, setScraping] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const runAllSources = async () => {
    const token = await getIdToken();
    if (!token) {
      showToast({ title: "Not signed in", variant: "danger" });
      return;
    }
    setScraping(true);
    setResult(null);
    try {
      const [syncRes, scrapeRes] = await Promise.all([
        fetch("/api/admin/sync", { method: "POST", headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ maxPages: 5 }),
        }),
      ]);
      const syncData = await syncRes.json().catch(() => ({}));
      const scrapeData = await scrapeRes.json().catch(() => ({}));
      setResult({ sync: syncData, scrape: scrapeData });
      const parts: string[] = [];
      if (syncData.owl?.created != null || syncData.owl?.updated != null) {
        parts.push(`Owl: ${syncData.owl.created ?? 0} created, ${syncData.owl.updated ?? 0} updated`);
      }
      if (syncData.grantsGov?.created != null || syncData.grantsGov?.updated != null) {
        parts.push(`Grants.gov: ${syncData.grantsGov.created ?? 0} created, ${syncData.grantsGov.updated ?? 0} updated`);
      }
      for (const [id, r] of Object.entries(scrapeData.results ?? {})) {
        const rr = r as { created?: number; updated?: number };
        if ((rr.created ?? 0) + (rr.updated ?? 0) > 0) {
          parts.push(`${SCRAPERS[id as ScraperId]?.name ?? id}: ${rr.created ?? 0} created, ${rr.updated ?? 0} updated`);
        }
      }
      showToast({
        title: "All sources updated",
        message: parts.length ? parts.join(". ") : "Check result below.",
        variant: "success",
      });
    } catch (e) {
      showToast({
        title: "Update failed",
        message: e instanceof Error ? e.message : "Something went wrong.",
        variant: "danger",
      });
      setResult({ error: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setScraping(false);
    }
  };

  const runCleanup = async () => {
    const token = await getIdToken();
    if (!token) {
      showToast({ title: "Not signed in", variant: "danger" });
      return;
    }
    setScraping(true);
    try {
      const res = await fetch("/api/admin/cleanup-expired", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const total = (data.expiredDeleted ?? 0) + (data.junkDeleted ?? 0);
        const parts: string[] = [];
        if ((data.expiredDeleted ?? 0) > 0) parts.push(`${data.expiredDeleted} expired`);
        if ((data.junkDeleted ?? 0) > 0) parts.push(`${data.junkDeleted} junk`);
        showToast({
          title: "Cleanup completed",
          message: total > 0 ? `${total} removed (${parts.join(", ")})` : "No scholarships to remove.",
          variant: "success",
        });
        setResult((prev) => (prev ? { ...prev, cleanup: data } : { cleanup: data }));
      } else {
        showToast({ title: "Cleanup failed", message: data.error, variant: "danger" });
      }
    } catch (e) {
      showToast({ title: "Cleanup failed", message: e instanceof Error ? e.message : "Request failed", variant: "danger" });
    } finally {
      setScraping(false);
    }
  };

  const runScrape = async (scrapers?: ScraperId[]) => {
    const token = await getIdToken();
    if (!token) {
      showToast({ title: "Not signed in", variant: "danger" });
      return;
    }
    setScraping(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scrapers: scrapers ?? SCRAPER_IDS,
          maxPages: 5,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setResult(data);
      if (res.ok) {
        const parts: string[] = [];
        for (const [id, r] of Object.entries(data.results ?? {})) {
          const rr = r as { created?: number; updated?: number; total?: number };
          if (rr.total != null && rr.total > 0) {
            parts.push(`${SCRAPERS[id as ScraperId]?.name ?? id}: ${rr.created ?? 0} created, ${rr.updated ?? 0} updated`);
          }
        }
        showToast({
          title: "Scrape completed",
          message: parts.length ? parts.join(". ") : "Check result below.",
          variant: "success",
        });
      } else {
        showToast({ title: "Scrape failed", message: data.error ?? "See result below.", variant: "danger" });
      }
    } catch (e) {
      showToast({
        title: "Scrape failed",
        message: e instanceof Error ? e.message : "Something went wrong.",
        variant: "danger",
      });
      setResult({ error: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setScraping(false);
    }
  };

  if (adminLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Scrape scholarships" subtitle="Pull from popular scholarship websites" />
        <div className="h-32 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <PageHeader title="Scrape scholarships" />
        <p className="text-sm text-[var(--muted)]">You don&apos;t have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scrape scholarships"
        subtitle="Pull scholarships from popular websites and add them to your catalog."
        primaryAction={
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={runAllSources}
              disabled={scraping}
            >
              {scraping ? "Running…" : "Run all sources"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => runScrape()}
              disabled={scraping}
            >
              Scrape only
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={runCleanup}
              disabled={scraping}
            >
              Cleanup expired
            </Button>
          </div>
        }
      />

      <Card className="p-4 text-sm">
        <h3 className="font-medium text-[var(--text)]">Sources</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-[var(--muted)]">
          {SCRAPER_IDS.map((id) => (
            <li key={id}>
              <strong>{SCRAPERS[id].name}</strong> – scrapes listings and imports into Firestore.
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-[var(--muted-2)]">
          <strong>Run all sources</strong> runs Sync (ScholarshipOwl, Grants.gov, custom URL) and Scrape (all listed providers) together.
        </p>
        <p className="mt-1 text-xs text-[var(--muted-2)]">
          Only scholarships with deadline today or later are added. Expired scholarships are removed from the database after each run.
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {SCRAPER_IDS.map((id) => (
          <Card key={id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-[var(--text)]">{SCRAPERS[id].name}</h4>
                <p className="mt-0.5 text-xs text-[var(--muted)]">Run this scraper only</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => runScrape([id])}
                disabled={scraping}
              >
                Scrape
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {result != null && (
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-medium text-[var(--text)]">Last result</h3>
          <pre className="max-h-64 overflow-auto rounded-lg bg-[var(--bg)] p-3 text-xs text-[var(--muted)]">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
