"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAdmin, getIdToken } from "@/hooks/useAdmin";

interface FeedbackItem {
  id: string;
  uid: string;
  email: string;
  type: string;
  message: string;
  scholarshipId?: string;
  at?: { _seconds?: number; seconds?: number };
}

export default function AdminFeedbackPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const load = async () => {
    const token = await getIdToken();
    if (!token) return;
    try {
      const res = await fetch("/api/admin/feedback", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin]);

  const handleClearList = async () => {
    const token = await getIdToken();
    if (!token) return;
    setClearing(true);
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setConfirmClearOpen(false);
        setItems([]);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to clear feedback");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to clear feedback");
    } finally {
      setClearing(false);
    }
  };

  const formatTime = (t?: { _seconds?: number; seconds?: number }) => {
    const sec = t?._seconds ?? t?.seconds;
    return sec ? new Date(sec * 1000).toLocaleString() : "—";
  };

  if (adminLoading || !isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Feedback" />
        {!isAdmin && <p className="text-sm text-[var(--muted)]">You don&apos;t have permission.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback"
        subtitle="User-submitted feedback and reports."
        primaryAction={
          items.length > 0 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmClearOpen(true)}
              disabled={clearing}
            >
              {clearing ? "Clearing…" : "Clear feedback list"}
            </Button>
          ) : null
        }
      />

      <Card className="p-4">
        {loading ? (
          <Skeleton className="h-48" />
        ) : items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No feedback yet.</p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="border-b border-[var(--border)] pb-3 last:border-0">
                <div className="flex justify-between text-xs text-[var(--muted-2)]">
                  <span>{item.email}</span>
                  <span>{formatTime(item.at)}</span>
                </div>
                <p className="mt-1 text-sm">{item.message}</p>
                {item.scholarshipId && (
                  <p className="mt-1 text-xs text-amber-400">Scholarship: {item.scholarshipId}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={confirmClearOpen}
        title="Clear feedback list?"
        description="This will permanently delete all feedback items. Use this after you've finished reviewing. This cannot be undone."
        primaryLabel="Clear all"
        destructive
        closeOnPrimaryClick={false}
        primaryDisabled={clearing}
        onClose={() => setConfirmClearOpen(false)}
        onPrimary={handleClearList}
        secondaryLabel="Cancel"
        onSecondary={() => setConfirmClearOpen(false)}
      />
    </div>
  );
}
