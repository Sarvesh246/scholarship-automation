"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAdmin, getIdToken } from "@/hooks/useAdmin";
import { useToast } from "@/components/ui/Toast";

interface SubmissionItem {
  id: string;
  title: string;
  sponsor: string;
  amount: number | null;
  deadline: string | null;
  description: string | null;
  applicationUrl: string | null;
  submittedBy: string;
  submittedByEmail: string | null;
  status: string;
  submittedAt: { _seconds: number } | null;
  reviewedAt: { _seconds: number } | null;
  scholarshipId: string | null;
  rejectedReason: string | null;
}

export default function AdminModerationPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { showToast } = useToast();
  const [items, setItems] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getIdToken();
    if (!token) return;
    try {
      const res = await fetch("/api/admin/moderation", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = (data.items ?? []).filter(Boolean);
        const pendingFirst = [...list.filter((i: SubmissionItem) => i.status === "pending"), ...list.filter((i: SubmissionItem) => i.status !== "pending")];
        setItems(pendingFirst);
      }
    } catch (e) {
      console.error(e);
      showToast({ title: "Failed to load queue", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin, load]);

  const formatTime = (t?: { _seconds?: number } | null) => {
    const sec = t?._seconds;
    return sec ? new Date(sec * 1000).toLocaleString() : "—";
  };

  const handleApprove = async (id: string) => {
    const token = await getIdToken();
    if (!token) return;
    setActing(id);
    try {
      const res = await fetch(`/api/admin/moderation/${id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({ title: data.error ?? "Approve failed", variant: "danger" });
        return;
      }
      showToast({ title: "Approved", message: `Scholarship created: ${data.scholarshipId}`, variant: "success" });
      await load();
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (id: string) => {
    const token = await getIdToken();
    if (!token) return;
    setActing(id);
    try {
      const res = await fetch(`/api/admin/moderation/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectReason[id] || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast({ title: data.error ?? "Reject failed", variant: "danger" });
        return;
      }
      showToast({ title: "Rejected", variant: "success" });
      setRejectReason((prev) => ({ ...prev, [id]: "" }));
      setExpandedId(null);
      await load();
    } finally {
      setActing(null);
    }
  };

  if (adminLoading || !isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Moderation queue" />
        {!isAdmin && <p className="text-sm text-[var(--muted)]">You don&apos;t have permission.</p>}
      </div>
    );
  }

  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moderation queue"
        subtitle={
          pendingCount > 0
            ? `${pendingCount} user-submitted scholarship${pendingCount === 1 ? "" : "s"} awaiting review. Approve to add to catalog or reject.`
            : "User-submitted scholarships. Approve to add to catalog or reject."
        }
      />

      <Card className="p-4">
        {loading ? (
          <Skeleton className="h-48" />
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No submissions yet. Organizations add scholarships via the form in the app.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const isPending = item.status === "pending";
              const isExpanded = expandedId === item.id;
              const busy = acting === item.id;
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 transition-colors ${
                    isPending ? "border-amber-500/30 bg-amber-500/5" : "border-[var(--border)] bg-[var(--surface)]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[var(--text)]">{item.title}</p>
                      <p className="text-xs text-[var(--muted-2)]">{item.sponsor}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0 text-[11px] text-[var(--muted-2)]">
                        {item.amount != null && item.amount > 0 && <span>${item.amount.toLocaleString()}</span>}
                        {item.deadline && <span>Due {item.deadline}</span>}
                        <span>{item.submittedByEmail ?? "—"}</span>
                        <span>{formatTime(item.submittedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === "approved" && item.scholarshipId && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                          Approved · {item.scholarshipId}
                        </span>
                      )}
                      {item.status === "rejected" && (
                        <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400">Rejected</span>
                      )}
                      {isPending && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          >
                            {isExpanded ? "Hide" : "Details"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="text-red-400 hover:bg-red-500/10"
                            onClick={() => handleReject(item.id)}
                            disabled={busy}
                          >
                            {busy ? "…" : "Reject"}
                          </Button>
                          <Button type="button" size="sm" onClick={() => handleApprove(item.id)} disabled={busy}>
                            {busy ? "…" : "Approve"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 border-t border-[var(--border)] pt-3 text-xs">
                      {item.description && (
                        <p className="text-[var(--muted-2)] whitespace-pre-wrap">{item.description}</p>
                      )}
                      {item.applicationUrl && (
                        <p className="mt-1">
                          <a href={item.applicationUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
                            {item.applicationUrl}
                          </a>
                        </p>
                      )}
                      {isPending && (
                        <div className="mt-2">
                          <label className="block text-[10px] text-[var(--muted-2)] mb-1">Reject reason (optional)</label>
                          <input
                            type="text"
                            value={rejectReason[item.id] ?? ""}
                            onChange={(e) => setRejectReason((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="e.g. Duplicate, not a scholarship"
                            className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-[var(--text)]"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {item.status === "rejected" && item.rejectedReason && (
                    <p className="mt-2 text-[11px] text-red-400/90">Reason: {item.rejectedReason}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
