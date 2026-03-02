"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EssayCard } from "@/components/feature/EssayCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { getEssays } from "@/lib/essayStorage";
import type { Essay } from "@/types";

export default function EssaysPage() {
  const router = useRouter();
  const [items, setItems] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEssays = useCallback(async () => {
    const essays = await getEssays();
    setItems(essays);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEssays();
  }, [loadEssays]);

  useEffect(() => {
    const onFocus = () => { loadEssays(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadEssays]);

  const handleNewEssay = () => {
    router.push("/app/essays/new");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Essays"
        subtitle="Keep reusable essay drafts in one place."
        primaryAction={
          <Button type="button" onClick={handleNewEssay}>
            New essay
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="No essays yet"
          description="Start your first essay draft — reuse it across similar scholarships."
          actionLabel="New essay"
          onAction={handleNewEssay}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((essay) => (
            <EssayCard key={essay.id} essay={essay} />
          ))}
        </div>
      )}
    </div>
  );
}
