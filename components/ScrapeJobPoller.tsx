"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { getIdToken } from "@/hooks/useAdmin";
import { SCRAPERS } from "@/lib/scrapers";
import type { ScraperId } from "@/lib/scrapers";

const STORAGE_KEY = "adminScrapeJobId";
const POLL_INTERVAL_MS = 5000;

function buildScrapeMessage(result: { results?: Record<string, { created?: number; updated?: number }> } | undefined): string {
  if (!result?.results) return "Scrape completed.";
  const parts = Object.entries(result.results)
    .filter(([, r]) => ((r?.created ?? 0) + (r?.updated ?? 0)) > 0)
    .map(([id, r]) => {
      const name = SCRAPERS[id as ScraperId]?.name ?? id;
      return `${name}: ${r?.created ?? 0} created, ${r?.updated ?? 0} updated`;
    });
  return parts.length ? parts.join(". ") : "Scrape completed.";
}

export function ScrapeJobPoller() {
  const { showToast } = useToast();
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function poll() {
      const jobId = typeof window !== "undefined" ? sessionStorage.getItem(STORAGE_KEY) : null;
      if (!jobId) return;

      getIdToken()
        .then((token) => {
          if (!token) return fetch(`/api/admin/scrape/status?jobId=${encodeURIComponent(jobId)}`);
          return fetch(`/api/admin/scrape/status?jobId=${encodeURIComponent(jobId)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          if (data.status === "completed" || data.status === "failed") {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            sessionStorage.removeItem(STORAGE_KEY);

            const result = data.result as { ok?: boolean; error?: string; results?: Record<string, { created?: number; updated?: number }> } | undefined;
            const message = data.status === "failed"
              ? (result?.error ?? "Scrape failed.")
              : buildScrapeMessage(result);

            const openScrapePage = () => router.push(`/app/admin/scrape?job=${encodeURIComponent(jobId)}`);

            showToast({
              title: data.status === "completed" ? "Scraping completed" : "Scraping failed",
              message,
              variant: data.status === "completed" ? "success" : "danger",
              actionLabel: "Open Sync & scrape",
              onAction: openScrapePage,
            });
          }
        })
        .catch(() => {});
    }

    const jobId = typeof window !== "undefined" ? sessionStorage.getItem(STORAGE_KEY) : null;
    if (!jobId) return;

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [showToast, router]);

  return null;
}
