"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAdmin, getIdToken } from "@/hooks/useAdmin";
import { decodeHtmlEntities } from "@/lib/utils";

type FilteredGrant = { id: string; title: string; amount?: number; reason: string };

export default function AdminCleanupPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { showToast } = useToast();
  const [junkPreview, setJunkPreview] = useState<{ id: string; title: string }[]>([]);
  const [filteredPreview, setFilteredPreview] = useState<FilteredGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runningFiltered, setRunningFiltered] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      const token = await getIdToken();
      if (!token) return;
      try {
        const [junkRes, filteredRes] = await Promise.all([
          fetch("/api/admin/junk-preview", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/admin/filtered-grants-preview", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (junkRes.ok) {
          const data = await junkRes.json();
          setJunkPreview(data.items ?? []);
        }
        if (filteredRes.ok) {
          const data = await filteredRes.json();
          setFilteredPreview(data.items ?? []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin]);

  const runCleanup = async () => {
    const token = await getIdToken();
    if (!token) {
      showToast({ title: "Not signed in", variant: "danger" });
      return;
    }
    setRunning(true);
    try {
      const res = await fetch("/api/admin/cleanup-expired", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
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
        setJunkPreview([]);
      } else {
        showToast({ title: "Cleanup failed", message: data.error, variant: "danger" });
      }
    } catch (e) {
      showToast({ title: "Cleanup failed", message: e instanceof Error ? e.message : "Request failed", variant: "danger" });
    } finally {
      setRunning(false);
    }
  };

  const runFilteredCleanup = async () => {
    const token = await getIdToken();
    if (!token) {
      showToast({ title: "Not signed in", variant: "danger" });
      return;
    }
    setRunningFiltered(true);
    try {
      const res = await fetch("/api/admin/cleanup-filtered-grants", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        const n = data.deleted ?? 0;
        showToast({
          title: "Cleanup completed",
          message: n > 0 ? `${n} filtered grant(s) removed from the database.` : "No filtered grants to remove.",
          variant: "success",
        });
        setFilteredPreview([]);
      } else {
        showToast({ title: "Cleanup failed", message: data.error, variant: "danger" });
      }
    } catch (e) {
      showToast({ title: "Cleanup failed", message: e instanceof Error ? e.message : "Request failed", variant: "danger" });
    } finally {
      setRunningFiltered(false);
    }
  };

  if (adminLoading || !isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Cleanup" />
        {!isAdmin && <p className="text-sm text-[var(--muted)]">You don&apos;t have permission.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cleanup"
        subtitle="Remove expired and junk scholarships (Bold.org category pages) from the database."
        primaryAction={
          <Button type="button" onClick={runCleanup} disabled={running}>
            {running ? "Running…" : "Run cleanup now"}
          </Button>
        }
      />

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">What gets removed</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-[var(--muted)]">
          <li><strong>Expired</strong> – scholarships with deadline before today</li>
          <li><strong>Junk</strong> – Bold.org category pages (By Demographics, By Major, By Year, By State)</li>
        </ul>
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">Junk preview ({junkPreview.length})</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">These scholarships will be deleted when you run cleanup.</p>
        {loading ? (
          <p className="mt-3 text-xs text-[var(--muted)]">Loading…</p>
        ) : junkPreview.length === 0 ? (
          <p className="mt-3 text-xs text-[var(--muted)]">No junk scholarships found.</p>
        ) : (
          <ul className="mt-3 max-h-48 overflow-y-auto space-y-1 text-xs">
            {junkPreview.map((item) => (
              <li key={item.id} className="flex justify-between gap-2">
                <span className="truncate">{decodeHtmlEntities(item.title)}</span>
                <span className="text-[var(--muted-2)] shrink-0">{item.id}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">Filtered grants ({filteredPreview.length})</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Institutional grants and scholarships over $150k. Hidden from the app list; remove from DB to shrink storage.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={runFilteredCleanup}
            disabled={runningFiltered || filteredPreview.length === 0}
          >
            {runningFiltered ? "Removing…" : "Clean up filtered grants"}
          </Button>
        </div>
        {loading ? (
          <p className="mt-3 text-xs text-[var(--muted)]">Loading…</p>
        ) : filteredPreview.length === 0 ? (
          <p className="mt-3 text-xs text-[var(--muted)]">No filtered grants in the database.</p>
        ) : (
          <ul className="mt-3 max-h-48 overflow-y-auto space-y-1.5 text-xs">
            {filteredPreview.slice(0, 50).map((item) => (
              <li key={item.id} className="flex justify-between gap-2">
                <span className="truncate min-w-0">{decodeHtmlEntities(item.title)}</span>
                <span className="text-[var(--muted-2)] shrink-0">
                  {item.amount != null ? `$${item.amount.toLocaleString()}` : ""} · {item.reason}
                </span>
              </li>
            ))}
            {filteredPreview.length > 50 && (
              <li className="text-[var(--muted-2)]">… and {filteredPreview.length - 50} more</li>
            )}
          </ul>
        )}
      </Card>
    </div>
  );
}
