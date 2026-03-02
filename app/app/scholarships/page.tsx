"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Skeleton } from "@/components/ui/Skeleton";
import { ScholarshipRowCard } from "@/components/feature/ScholarshipRowCard";
import { getScholarships } from "@/lib/scholarshipStorage";
import { getApplications, ensureApplication } from "@/lib/applicationStorage";
import type { Scholarship } from "@/types";

export default function ScholarshipsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [items, setItems] = useState<Scholarship[]>([]);
  const [applicationIds, setApplicationIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadScholarships = useCallback(async () => {
    const [data, apps] = await Promise.all([getScholarships(), getApplications()]);
    setItems(data);
    setApplicationIds(new Set(apps.map((a) => a.id)));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadScholarships();
  }, [loadScholarships]);

  const filtered = items.filter((s) =>
    s.title.toLowerCase().includes(query.toLowerCase())
  );

  const handleDeleteScholarship = (id: string) => {
    setItems((previous) => previous.filter((scholarship) => scholarship.id !== id));
  };

  const handleStartApplication = useCallback(
    async (scholarship: Scholarship) => {
      await ensureApplication(scholarship.id);
      setApplicationIds((prev) => new Set(prev).add(scholarship.id));
      router.push(`/app/applications/${scholarship.id}`);
    },
    [router]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-14 rounded-2xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scholarships"
        subtitle="Browse and choose where to invest your time."
      />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
        <div className="w-full max-w-xs">
          <Input
            placeholder="Search scholarships"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select className="w-40" defaultValue="soonest">
          <option value="soonest">Sort: Soonest deadline</option>
          <option value="amount">Sort: Highest amount</option>
        </Select>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setDrawerOpen(true)}
        >
          Filters
        </Button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            No scholarships found. Try a different search or check back later.
          </p>
        ) : (
          filtered.map((scholarship) => (
            <ScholarshipRowCard
              key={scholarship.id}
              scholarship={scholarship}
              hasApplication={applicationIds.has(scholarship.id)}
              onStartApplication={handleStartApplication}
              onDelete={() => handleDeleteScholarship(scholarship.id)}
            />
          ))
        )}
      </div>

      <Drawer
        open={drawerOpen}
        title="Filter scholarships"
        onClose={() => setDrawerOpen(false)}
      >
        <div className="space-y-3 text-xs">
          <p className="font-medium text-[var(--muted)]">Deadline</p>
          <Select defaultValue="any">
            <option value="any">Any time</option>
            <option value="30">Next 30 days</option>
            <option value="60">Next 60 days</option>
          </Select>

          <p className="mt-4 font-medium text-[var(--muted)]">Amount</p>
          <Select defaultValue="any">
            <option value="any">Any amount</option>
            <option value="2000">$2,000+</option>
            <option value="5000">$5,000+</option>
          </Select>

          <p className="mt-4 font-medium text-[var(--muted)]">Effort level</p>
          <Select defaultValue="any">
            <option value="any">Any</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </div>
      </Drawer>
    </div>
  );
}
