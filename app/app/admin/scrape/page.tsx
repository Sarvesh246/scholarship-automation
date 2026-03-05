"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAdmin, getIdToken } from "@/hooks/useAdmin";
import { SCRAPERS, type ScraperId } from "@/lib/scrapers";

const SCRAPER_IDS = Object.keys(SCRAPERS) as ScraperId[];
const STORAGE_KEY = "adminScrapeJobId";
const POLL_INTERVAL_MS = 5000;

export default function AdminScrapePage() {
  const searchParams = useSearchParams();
  const jobIdFromUrl = searchParams.get("job");
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { showToast } = useToast();
  const [scraping, setScraping] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [cleaningExpired, setCleaningExpired] = useState(false);
  const [validating, setValidating] = useState(false);
  const [lastCleanupDone, setLastCleanupDone] = useState<number | null>(null);
  const [cleanupRecommended, setCleanupRecommended] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [validationResult, setValidationResult] = useState<Record<string, unknown> | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [importUrls, setImportUrls] = useState("");
  const [importSourceLabel, setImportSourceLabel] = useState("import_url");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore background job state when returning to the page (e.g. from another tab)
  useEffect(() => {
    if (typeof sessionStorage === "undefined" || !isAdmin) return;
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      setActiveJobId(stored);
      setScraping(true);
    }
  }, [isAdmin]);

  // Poll job status when we have an active background job; clear scraping state when done
  useEffect(() => {
    const jobId = activeJobId ?? (typeof sessionStorage !== "undefined" ? sessionStorage.getItem(STORAGE_KEY) : null);
    if (!jobId || !isAdmin) return;

    const poll = async () => {
      try {
        const token = await getIdToken();
        const res = await fetch(`/api/admin/scrape/status?jobId=${encodeURIComponent(jobId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        setJobStatus(data.status ?? null);
        if (data.status === "completed" || data.status === "failed") {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          sessionStorage.removeItem(STORAGE_KEY);
          setActiveJobId(null);
          setScraping(false);
          setResult((data.result ?? {}) as Record<string, unknown>);
        }
      } catch {
        // ignore
      }
    };

    poll();
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [activeJobId, isAdmin]);

  useEffect(() => {
    if (!jobIdFromUrl || !isAdmin) return;
    let cancelled = false;
    getIdToken()
      .then((token) => {
        if (!token) return null;
        return fetch(`/api/admin/scrape/status?jobId=${encodeURIComponent(jobIdFromUrl)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      })
      .then((res) => (res?.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setJobStatus(data.status);
        if (data.status === "completed" || data.status === "failed") {
          setResult(data.result ?? { error: (data.result as { error?: string })?.error ?? "Unknown" });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [jobIdFromUrl, isAdmin]);

  const runAllSources = async () => {
    const token = await getIdToken();
    if (!token) {
      showToast({ title: "Not signed in", variant: "danger" });
      return;
    }
    setScraping(true);
    setResult(null);
    let backgroundScrapeStarted = false;
    try {
      const syncRes = await fetch("/api/admin/sync", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const syncData = await syncRes.json().catch(() => ({}));

      const scrapeRes = await fetch("/api/admin/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ maxPages: 12, background: true }),
      });
      const scrapeData = await scrapeRes.json().catch(() => ({}));

      setResult({ sync: syncData, scrape: scrapeData });

      if (scrapeRes.status === 202 && scrapeData.jobId) {
        backgroundScrapeStarted = true;
        if (typeof sessionStorage !== "undefined") sessionStorage.setItem(STORAGE_KEY, scrapeData.jobId);
        setActiveJobId(scrapeData.jobId);
        setCleanupRecommended(true);
        const syncParts: string[] = [];
        if (syncData.owl?.created != null || syncData.owl?.updated != null) {
          syncParts.push(`Owl: ${syncData.owl.created ?? 0} created, ${syncData.owl.updated ?? 0} updated`);
        }
        if (syncData.url?.created != null || syncData.url?.updated != null) {
          syncParts.push(`URL: ${syncData.url.created ?? 0} created, ${syncData.url.updated ?? 0} updated`);
        }
        if (syncData.rss?.created != null || syncData.rss?.updated != null) {
          syncParts.push(`RSS: ${syncData.rss.created ?? 0} created, ${syncData.rss.updated ?? 0} updated`);
        }
        if (syncData.nihReporter?.created != null || syncData.nihReporter?.updated != null) {
          syncParts.push(`NIH: ${syncData.nihReporter.created ?? 0} created, ${syncData.nihReporter.updated ?? 0} updated`);
        }
        if (syncData.grantsGov?.created != null || syncData.grantsGov?.updated != null) {
          syncParts.push(`Grants.gov: ${syncData.grantsGov.created ?? 0} created, ${syncData.grantsGov.updated ?? 0} updated`);
        }
        showToast({
          title: "Sync done. Scrape running in background",
          message: syncParts.length ? syncParts.join(". ") + " Scrape will notify you when done." : "Scrape running in background. You can leave this page.",
          variant: "success",
        });
        return;
      }

      setCleanupRecommended(true);
      const parts: string[] = [];
      if (syncData.owl?.created != null || syncData.owl?.updated != null) {
        parts.push(`Owl: ${syncData.owl.created ?? 0} created, ${syncData.owl.updated ?? 0} updated`);
      }
      if (syncData.url?.created != null || syncData.url?.updated != null) {
        parts.push(`URL: ${syncData.url.created ?? 0} created, ${syncData.url.updated ?? 0} updated`);
      }
      if (syncData.rss?.created != null || syncData.rss?.updated != null) {
        parts.push(`RSS: ${syncData.rss.created ?? 0} created, ${syncData.rss.updated ?? 0} updated`);
      }
      if (syncData.nihReporter?.created != null || syncData.nihReporter?.updated != null) {
        parts.push(`NIH: ${syncData.nihReporter.created ?? 0} created, ${syncData.nihReporter.updated ?? 0} updated`);
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
      if (!backgroundScrapeStarted) setScraping(false);
    }
  };

  const runCleanup = async () => {
    const token = await getIdToken();
    if (!token) {
      showToast({ title: "Not signed in", variant: "danger" });
      return;
    }
    setCleaningExpired(true);
    setLastCleanupDone(null);
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
        setCleanupRecommended(false);
        setLastCleanupDone(total);
        window.setTimeout(() => setLastCleanupDone(null), 4000);
      } else {
        showToast({ title: "Cleanup failed", message: data.error, variant: "danger" });
      }
    } catch (e) {
      showToast({ title: "Cleanup failed", message: e instanceof Error ? e.message : "Request failed", variant: "danger" });
    } finally {
      setCleaningExpired(false);
    }
  };

  const runValidation = async () => {
    const token = await getIdToken();
    if (!token) {
      showToast({ title: "Not signed in", variant: "danger" });
      return;
    }
    setValidating(true);
    setValidationResult(null);
    try {
      const res = await fetch("/api/admin/validate-scholarships", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      setValidationResult(data);
      if (res.ok) {
        const parts = [
          `${data.totalProcessed ?? 0} processed`,
          `${data.expiredRemoved ?? 0} expired removed`,
          `${data.lowQualityDeleted ?? 0} low-quality deleted`,
          `${data.hiddenCount ?? 0} hidden from main feed`,
        ];
        showToast({
          title: "Validation complete",
          message: parts.join(", "),
          variant: "success",
        });
      } else {
        showToast({ title: "Validation failed", message: data.error ?? "See result below.", variant: "danger" });
      }
    } catch (e) {
      showToast({
        title: "Validation failed",
        message: e instanceof Error ? e.message : "Something went wrong.",
        variant: "danger",
      });
      setValidationResult({ error: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setValidating(false);
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
    setJobStatus(null);
    let backgroundStarted = false;
    try {
      const res = await fetch("/api/admin/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scrapers: scrapers ?? SCRAPER_IDS,
          maxPages: 12,
          background: true,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 202 && data.jobId) {
        backgroundStarted = true;
        if (typeof sessionStorage !== "undefined") sessionStorage.setItem(STORAGE_KEY, data.jobId);
        setActiveJobId(data.jobId);
        setCleanupRecommended(true);
        showToast({
          title: "Scrape running in background",
          message: "You can leave this page. We'll notify you when it's done.",
          variant: "success",
        });
        return;
      }

      setCleanupRecommended(true);
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
      if (!backgroundStarted) setScraping(false);
    }
  };

  const runImportFromUrls = async () => {
    const token = await getIdToken();
    if (!token) {
      showToast({ title: "Not signed in", variant: "danger" });
      return;
    }
    const urls = importUrls
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http://") || u.startsWith("https://"));
    if (urls.length === 0) {
      showToast({ title: "Enter at least one HTTP(S) URL", variant: "danger" });
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/import-urls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          urls,
          sourceLabel: importSourceLabel.trim() || "import_url",
        }),
      });
      const data = await res.json().catch(() => ({}));
      setImportResult(data);
      if (res.ok) {
        showToast({
          title: "Import complete",
          message: `${data.created ?? 0} created, ${data.updated ?? 0} updated${data.errors?.length ? ` (${data.errors.length} errors)` : ""}`,
          variant: "success",
        });
        setCleanupRecommended(true);
      } else {
        showToast({ title: "Import failed", message: data.error ?? data.detail ?? "See result below.", variant: "danger" });
      }
    } catch (e) {
      showToast({ title: "Import failed", message: e instanceof Error ? e.message : "Request failed", variant: "danger" });
      setImportResult({ error: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setImporting(false);
    }
  };

  if (adminLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Sync & scrape" subtitle="Sync APIs and scrape scholarship sites" />
        <div className="h-32 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <PageHeader title="Sync & scrape" />
        <p className="text-sm text-[var(--muted)]">You don&apos;t have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sync & scrape"
        subtitle="Run sync (Owl, URL, Grants.gov, RSS, NIH RePORTER), import from JSON URLs, scrape aggregators and foundations, then run full validation."
        primaryAction={
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={runAllSources}
              disabled={scraping}
            >
              {scraping ? "Scraping…" : "Run all sources"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => runScrape()}
              disabled={scraping}
            >
              {scraping ? "Scraping…" : "Scrape only"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={runCleanup}
              disabled={scraping || cleaningExpired}
            >
              {cleaningExpired
                ? "Cleaning…"
                : lastCleanupDone !== null
                  ? lastCleanupDone > 0
                    ? `Done (${lastCleanupDone} removed)`
                    : "Done (none to remove)"
                  : cleanupRecommended
                    ? "Cleanup expired"
                    : "Cleanup"}
            </Button>
          </div>
        }
      />

      <Card className="p-4 text-sm">
        <h3 className="font-medium text-[var(--text)]">Sources</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-[var(--muted)]">
          <li><strong>Sync:</strong> ScholarshipOwl (if API key set), custom URL (SCHOLARSHIP_API_URL), Grants.gov (federal education grants), RSS feeds (SCHOLARSHIP_RSS_FEEDS), NIH RePORTER (if NIH_REPORTER_ENABLED).</li>
          {SCRAPER_IDS.map((id) => (
            <li key={id}>
              <strong>{SCRAPERS[id].name}</strong> – scrapes listings and imports into Firestore.
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-[var(--muted-2)]">
          <strong>Run all sources</strong> runs Sync first, then Scrape (all listed providers). <strong>Scrape only</strong> skips sync. Use <strong>Import from URLs</strong> below to pull from any JSON API (e.g. ScholarshipAPI.com, Apify).
        </p>
        <p className="mt-1 text-xs text-[var(--muted-2)]">
          Only scholarships with deadline today or later are added. Use <strong>Run full validation</strong> below to clean expired and low-quality listings.
        </p>
      </Card>

      <Card className="p-4">
        <h3 className="font-medium text-[var(--text)]">Import from URLs</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Fetch scholarships from one or more JSON URLs. Each URL must return an array of items, or an object with <code className="text-xs bg-[var(--bg)] px-1 rounded">items</code> / <code className="text-xs bg-[var(--bg)] px-1 rounded">data</code> / <code className="text-xs bg-[var(--bg)] px-1 rounded">scholarships</code> / <code className="text-xs bg-[var(--bg)] px-1 rounded">results</code>. Items go through the same quality pipeline.
        </p>
        <div className="mt-3 space-y-2">
          <label className="block text-xs font-medium text-[var(--muted)]">URLs (one per line or comma-separated)</label>
          <textarea
            value={importUrls}
            onChange={(e) => setImportUrls(e.target.value)}
            placeholder={"https://api.example.com/scholarships\nhttps://another-feed.com/data.json"}
            rows={4}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-mono placeholder:text-[var(--muted-2)]"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-[var(--muted)]">Source label (for Firestore):</label>
            <Input
              value={importSourceLabel}
              onChange={(e) => setImportSourceLabel(e.target.value)}
              placeholder="import_url"
              className="max-w-[180px] text-sm"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={runImportFromUrls}
              disabled={importing || !importUrls.trim()}
            >
              {importing ? "Importing…" : "Import"}
            </Button>
          </div>
        </div>
        {importResult != null && (
          <pre className="mt-3 max-h-32 overflow-auto rounded-lg bg-[var(--bg)] p-2 text-xs text-[var(--muted)]">
            {JSON.stringify(importResult, null, 2)}
          </pre>
        )}
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

      <Card id="validation" className="p-4">
        <h3 className="font-medium text-[var(--text)]">Run full validation</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Quality and scholarship-definition checks on every listing: quality score, verification status,
          domain trust, display category, funding type (scholarship vs institutional/federal). Only
          scholarship and fellowship types show in the main app feed.
        </p>
        <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-[var(--muted)]">
          <li>Removes expired and very low quality (score &lt; 50).</li>
          <li>Hard exclusions: institutional keywords, award &gt; $100k, non-student applicant type, EIN/DUNS/SAM requirements.</li>
          <li>Items reclassified as institutional_grant or government_program are hidden from the main feed but kept in the DB.</li>
        </ul>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          onClick={runValidation}
          disabled={validating}
        >
          {validating ? "Validating…" : "Run full validation now"}
        </Button>
      </Card>

      {jobIdFromUrl && (jobStatus === "pending" || jobStatus === "running") && (
        <Card className="p-4">
          <p className="text-sm text-[var(--muted)]">
            Scrape in progress. You&apos;ll get a notification when it&apos;s done, or refresh this page to see the audit.
          </p>
        </Card>
      )}

      {result != null && (
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-medium text-[var(--text)]">
            {jobIdFromUrl ? "Scrape audit" : "Last result"}
            {jobStatus && (
              <span className="ml-2 text-xs font-normal text-[var(--muted)]">({jobStatus})</span>
            )}
          </h3>
          <pre className="max-h-64 overflow-auto rounded-lg bg-[var(--bg)] p-3 text-xs text-[var(--muted)]">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}

      {validationResult != null && (
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-medium text-[var(--text)]">Validation result</h3>
          {validationResult && typeof validationResult === "object" && "ok" in validationResult && (validationResult as { ok?: boolean }).ok && (
            <p className="mb-2 text-xs text-[var(--muted)]">
              Processed: {(validationResult as { totalProcessed?: number }).totalProcessed ?? 0} · Expired removed: {(validationResult as { expiredRemoved?: number }).expiredRemoved ?? 0} · Low quality deleted: {(validationResult as { lowQualityDeleted?: number }).lowQualityDeleted ?? 0} · Hidden: {(validationResult as { hiddenCount?: number }).hiddenCount ?? 0}
            </p>
          )}
          <pre className="max-h-48 overflow-auto rounded-lg bg-[var(--bg)] p-3 text-xs text-[var(--muted)]">
            {JSON.stringify(validationResult, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
