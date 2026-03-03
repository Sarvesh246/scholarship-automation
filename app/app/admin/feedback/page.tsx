"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
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

  useEffect(() => {
    if (!isAdmin) return;
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
    load();
  }, [isAdmin]);

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
    </div>
  );
}
