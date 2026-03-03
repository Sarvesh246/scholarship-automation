"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { useAdmin, getIdToken } from "@/hooks/useAdmin";

export default function AdminDataQualityPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [reviewQueue, setReviewQueue] = useState<{ id: string; title: string; sponsor: string; amount: number; issues: string[] }[]>([]);
  const [duplicates, setDuplicates] = useState<{ normalized: string; scholarships: { id: string; title: string; amount: number }[] }[]>([]);
  const [loading, setLoading] = useState(true);

  const adminEditUrl = (id: string) => `/app/admin/scholarships?edit=${encodeURIComponent(id)}`;

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      const token = await getIdToken();
      if (!token) return;
      try {
        const [reviewRes, dupRes] = await Promise.all([
          fetch("/api/admin/review-queue", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/admin/duplicates", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (reviewRes.ok) {
          const d = await reviewRes.json();
          setReviewQueue(d.items ?? []);
        }
        if (dupRes.ok) {
          const d = await dupRes.json();
          setDuplicates(d.groups ?? []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin]);

  if (adminLoading || !isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Data quality" />
        {!isAdmin && <p className="text-sm text-[var(--muted)]">You don&apos;t have permission.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data quality"
        subtitle="Review queue and potential duplicates."
      />

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">Review queue ({reviewQueue.length})</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">Scholarships that may need attention.</p>
        {loading ? (
          <p className="mt-3 text-xs text-[var(--muted)]">Loading…</p>
        ) : reviewQueue.length === 0 ? (
          <p className="mt-3 text-xs text-[var(--muted)]">No items need review.</p>
        ) : (
          <ul className="mt-3 max-h-64 overflow-y-auto space-y-2 text-xs">
            {reviewQueue.slice(0, 30).map((item) => (
              <li key={item.id} className="flex justify-between gap-2 items-start">
                <div className="min-w-0">
                  <Link href={`/app/scholarships/${item.id}`} className="text-amber-400 hover:underline truncate block">
                    {item.title}
                  </Link>
                  <span className="text-[var(--muted-2)]">{item.issues.join(", ")}</span>
                </div>
                <span className="shrink-0 flex items-center gap-2">
                  <Link href={adminEditUrl(item.id)} className="text-amber-400 hover:underline">Edit</Link>
                  <span>${item.amount.toLocaleString()}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">Potential duplicates ({duplicates.length} groups)</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">Scholarships with similar titles.</p>
        {loading ? (
          <p className="mt-3 text-xs text-[var(--muted)]">Loading…</p>
        ) : duplicates.length === 0 ? (
          <p className="mt-3 text-xs text-[var(--muted)]">No duplicates found.</p>
        ) : (
          <ul className="mt-3 max-h-64 overflow-y-auto space-y-3 text-xs">
            {duplicates.slice(0, 20).map((g, i) => (
              <li key={i} className="border-b border-[var(--border)] pb-2 last:border-0">
                <p className="text-[var(--muted-2)] mb-1">{g.normalized}</p>
                {g.scholarships.map((s) => (
                  <div key={s.id} className="flex justify-between items-center gap-2">
                    <Link href={`/app/scholarships/${s.id}`} className="text-amber-400 hover:underline truncate">
                      {s.title}
                    </Link>
                    <span className="shrink-0 flex items-center gap-2">
                      <Link href={adminEditUrl(s.id)} className="text-amber-400 hover:underline">Edit</Link>
                      <span>${s.amount.toLocaleString()}</span>
                    </span>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
