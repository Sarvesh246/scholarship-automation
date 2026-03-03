"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useAdmin, getIdToken } from "@/hooks/useAdmin";

export default function AdminSyncPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { showToast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [validationResult, setValidationResult] = useState<Record<string, unknown> | null>(null);

  const runSync = async () => {
    const token = await getIdToken();
    if (!token) {
      showToast({ title: "Not signed in", variant: "danger" });
      return;
    }
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      setResult(data);
      if (res.ok) {
        const parts: string[] = [];
        if (data.owl?.created != null || data.owl?.updated != null) {
          parts.push(`Owl: ${data.owl.created ?? 0} created, ${data.owl.updated ?? 0} updated`);
        }
        if (data.grantsGov?.created != null || data.grantsGov?.updated != null) {
          parts.push(`Grants.gov: ${data.grantsGov.created ?? 0} created, ${data.grantsGov.updated ?? 0} updated`);
        }
        if (data.url?.created != null || data.url?.updated != null) {
          parts.push(`URL: ${data.url.created ?? 0} created, ${data.url.updated ?? 0} updated`);
        }
        showToast({
          title: "Sync completed",
          message: parts.length ? parts.join(". ") : "Check result below.",
          variant: "success",
        });
      } else {
        showToast({ title: "Sync failed", message: data.error ?? "See result below.", variant: "danger" });
      }
    } catch (e) {
      showToast({
        title: "Sync failed",
        message: e instanceof Error ? e.message : "Something went wrong.",
        variant: "danger",
      });
      setResult({ error: e instanceof Error ? e.message : "Request failed" });
    } finally {
      setSyncing(false);
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

  if (adminLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Sync scholarships" subtitle="Run sync from the website" />
        <div className="h-32 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <PageHeader title="Sync scholarships" />
        <p className="text-sm text-[var(--muted)]">You don&apos;t have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sync scholarships"
        subtitle="Pull latest scholarships from ScholarshipOwl or your custom API into Firestore."
        primaryAction={
          <Button
            type="button"
            onClick={runSync}
            disabled={syncing}
          >
            {syncing ? "Syncing…" : "Run sync now"}
          </Button>
        }
      />

      <Card className="p-4 text-sm">
        <h3 className="font-medium text-[var(--text)]">What runs</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-[var(--muted)]">
          <li><strong>ScholarshipOwl</strong> – if SCHOLARSHIP_OWL_API_KEY is set: lists scholarships, fetches fields/requirements, writes to Firestore.</li>
          <li><strong>Custom URL</strong> – if SCHOLARSHIP_API_URL is set: fetches JSON array (or data/scholarships/results), maps and writes to Firestore.</li>
          <li><strong>Grants.gov</strong> – always runs: fetches federal education grants (no API key), writes to Firestore.</li>
        </ul>
        <p className="mt-3 text-xs text-[var(--muted-2)]">
          Same logic as the cron job; no CRON_SECRET needed when run from Admin.
        </p>
      </Card>

      <Card className="p-4" id="validation">
        <h3 className="font-medium text-[var(--text)]">STEP 0 — Full validation pass</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Runs quality and <strong>scholarship-definition</strong> checks on every listing: quality score, verification status,
          domain trust, display category, and <strong>funding type</strong> (scholarship vs institutional/federal). Only
          scholarship and fellowship types show in the main app feed.
        </p>
        <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-[var(--muted)]">
          <li>Removes expired and very low quality (score &lt; 50).</li>
          <li>Applies hard exclusions: institutional keywords, award &gt; $100k, non-student applicant type, EIN/DUNS/SAM requirements.</li>
          <li>Scholarship score (≥30): student mention, award &lt; $25k, GPA/essay boost; institution/PI/large award penalties.</li>
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

      {validationResult != null && (
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-medium text-[var(--text)]">Validation result</h3>
          {validationResult && typeof validationResult === "object" && "ok" in validationResult && (validationResult as { ok?: boolean }).ok && (
            <p className="mb-2 text-xs text-[var(--muted)]">
              Processed: {(validationResult as { totalProcessed?: number }).totalProcessed ?? 0} · Expired removed: {(validationResult as { expiredRemoved?: number }).expiredRemoved ?? 0} · Low quality deleted: {(validationResult as { lowQualityDeleted?: number }).lowQualityDeleted ?? 0} · Hidden (flagged or non–main-feed): {(validationResult as { hiddenCount?: number }).hiddenCount ?? 0}
            </p>
          )}
          <pre className="max-h-48 overflow-auto rounded-lg bg-[var(--bg)] p-3 text-xs text-[var(--muted)]">
            {JSON.stringify(validationResult, null, 2)}
          </pre>
        </Card>
      )}

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
