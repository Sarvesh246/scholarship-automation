"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Skeleton } from "@/components/ui/Skeleton";
import { ScholarshipRowCard } from "@/components/feature/ScholarshipRowCard";
import { getScholarships, invalidateScholarshipCache } from "@/lib/scholarshipStorage";
import { getApplications, ensureApplication } from "@/lib/applicationStorage";
import { classifyScholarship } from "@/lib/classifyScholarship";
import type { Scholarship, ScholarshipCategory } from "@/types";

type SortOption = "soonest" | "amount" | "latest" | "lowest" | "title" | "effort_high" | "effort_low";
type TypeFilter = "all" | "non_citizen" | "private" | "government";
type DeadlineFilter = "any" | "7" | "30" | "60" | "90";
type AmountFilter = "any" | "1000" | "2000" | "5000" | "10000";
type EffortFilter = "any" | "low" | "medium" | "high";

function parseEffort(estimatedTime: string): "low" | "medium" | "high" {
  const t = (estimatedTime || "").toLowerCase();
  if (t.includes("min") || (t.includes("30") && !t.includes("hour"))) return "low";
  if (t.includes("hour") || t.includes("1 h") || t.includes("2 h")) return "medium";
  return "high";
}

function effortRank(e: "low" | "medium" | "high"): number {
  return e === "low" ? 1 : e === "medium" ? 2 : 3;
}

const CATEGORIES: { value: ScholarshipCategory; label: string }[] = [
  { value: "STEM", label: "STEM" },
  { value: "Arts", label: "Arts" },
  { value: "Community", label: "Community" },
  { value: "Leadership", label: "Leadership" },
  { value: "FinancialNeed", label: "Financial need" },
];

export default function ScholarshipsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("soonest");
  const [deadlineDays, setDeadlineDays] = useState<DeadlineFilter>("any");
  const [minAmount, setMinAmount] = useState<AmountFilter>("any");
  const [category, setCategory] = useState<ScholarshipCategory | "any">("any");
  const [effort, setEffort] = useState<EffortFilter>("any");
  const [hideExpired, setHideExpired] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [items, setItems] = useState<Scholarship[]>([]);
  const [applicationIds, setApplicationIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const loadScholarships = useCallback(async () => {
    invalidateScholarshipCache();
    setLoading(true);
    const [data, apps] = await Promise.all([getScholarships(), getApplications()]);
    setItems(data);
    setApplicationIds(new Set(apps.map((a) => a.scholarshipId)));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadScholarships();
  }, [loadScholarships]);

  const filtered = useMemo(() => {
    const now = new Date();
    const deadlineCutoff =
      deadlineDays !== "any"
        ? new Date(now.getTime() + parseInt(deadlineDays, 10) * 24 * 60 * 60 * 1000)
        : null;
    const minAmountNum = minAmount !== "any" ? parseInt(minAmount, 10) : 0;

    return items.filter((s) => {
      if (typeFilter !== "all") {
        const { scholarshipType, nonCitizenEligible } = classifyScholarship(s);
        if (typeFilter === "non_citizen" && !nonCitizenEligible) return false;
        if (typeFilter === "government" && scholarshipType !== "government") return false;
        if (typeFilter === "private" && scholarshipType !== "private") return false;
      }
      if (!s.title.toLowerCase().includes(query.toLowerCase())) return false;
      if (hideExpired && s.expiredAt) return false;
      if (deadlineCutoff && s.deadline) {
        const d = new Date(s.deadline);
        if (d < now) return false;
        if (d > deadlineCutoff) return false;
      }
      if (minAmountNum > 0 && (s.amount ?? 0) < minAmountNum) return false;
      if (category !== "any" && !s.categoryTags?.includes(category)) return false;
      if (effort !== "any" && parseEffort(s.estimatedTime || "") !== effort) return false;
      if (applicationIds.has(s.id)) return false;
      return true;
    });
  }, [items, query, deadlineDays, minAmount, category, effort, hideExpired, applicationIds, typeFilter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const getDeadline = (s: Scholarship) => (s.deadline ? new Date(s.deadline).getTime() : 0);
    const getAmount = (s: Scholarship) => s.amount ?? 0;
    if (sortBy === "soonest") list.sort((a, b) => getDeadline(a) - getDeadline(b));
    else if (sortBy === "latest") list.sort((a, b) => getDeadline(b) - getDeadline(a));
    else if (sortBy === "amount") list.sort((a, b) => getAmount(b) - getAmount(a));
    else if (sortBy === "lowest") list.sort((a, b) => getAmount(a) - getAmount(b));
    else if (sortBy === "title") list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    else if (sortBy === "effort_high") list.sort((a, b) => effortRank(parseEffort(b.estimatedTime || "")) - effortRank(parseEffort(a.estimatedTime || "")));
    else if (sortBy === "effort_low") list.sort((a, b) => effortRank(parseEffort(a.estimatedTime || "")) - effortRank(parseEffort(b.estimatedTime || "")));
    return list;
  }, [filtered, sortBy]);

  const totalPages = Math.ceil(sorted.length / perPage) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return sorted.slice(start, start + perPage);
  }, [sorted, page, perPage]);

  useEffect(() => {
    setPage(1);
  }, [query, sortBy, deadlineDays, minAmount, category, effort, hideExpired, typeFilter]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadScholarships();
    setRefreshing(false);
  }, [loadScholarships]);

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
        subtitle="Browse scholarships you haven't started yet. Started applications appear in Applications."
        primaryAction={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2">
        <div className="flex w-full flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3">
          <span className="text-xs font-medium text-[var(--muted)]">Show:</span>
          {[
            { value: "all" as TypeFilter, label: "All" },
            { value: "non_citizen" as TypeFilter, label: "Non-Citizen Eligible" },
            { value: "private" as TypeFilter, label: "Private/Institutional" },
            { value: "government" as TypeFilter, label: "Government" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTypeFilter(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                typeFilter === opt.value
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "border border-[var(--border)] text-[var(--muted)] hover:border-amber-500/30 hover:text-[var(--text)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2 text-sm">
        <div className="w-full max-w-xs md:w-auto md:max-w-xs">
          <Input
            placeholder="Search scholarships"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select
          className="w-44"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
        >
          <option value="soonest">Sort: Soonest deadline</option>
          <option value="latest">Sort: Latest deadline</option>
          <option value="amount">Sort: Highest amount</option>
          <option value="lowest">Sort: Lowest amount</option>
          <option value="effort_high">Sort: Highest effort</option>
          <option value="effort_low">Sort: Lowest effort</option>
          <option value="title">Sort: Title A–Z</option>
        </Select>
        <Select
          className="w-32"
          value={String(perPage)}
          onChange={(e) => {
            setPerPage(parseInt(e.target.value, 10));
            setPage(1);
          }}
        >
          <option value="25">25 per page</option>
          <option value="50">50 per page</option>
          <option value="100">100 per page</option>
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
      </div>

      {sorted.length > 0 && (
        <p className="text-sm text-[var(--muted)]">
          Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, sorted.length)} of {sorted.length} scholarships
        </p>
      )}

      <div className="space-y-3">
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            No scholarships found. Try a different search or filters.
          </p>
        ) : (
          paginated.map((scholarship) => (
            <ScholarshipRowCard
              key={scholarship.id}
              scholarship={scholarship}
              hasApplication={false}
              onStartApplication={handleStartApplication}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <p className="text-sm text-[var(--muted)]">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Drawer
        open={drawerOpen}
        title="Filter scholarships"
        onClose={() => setDrawerOpen(false)}
      >
        <div className="space-y-4 text-xs">
          <div>
            <p className="font-medium text-[var(--muted)] mb-1.5">Deadline</p>
            <Select
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(e.target.value as DeadlineFilter)}
            >
              <option value="any">Any time</option>
              <option value="7">Next 7 days</option>
              <option value="30">Next 30 days</option>
              <option value="60">Next 60 days</option>
              <option value="90">Next 90 days</option>
            </Select>
          </div>

          <div>
            <p className="font-medium text-[var(--muted)] mb-1.5">Minimum amount</p>
            <Select
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value as AmountFilter)}
            >
              <option value="any">Any amount</option>
              <option value="1000">$1,000+</option>
              <option value="2000">$2,000+</option>
              <option value="5000">$5,000+</option>
              <option value="10000">$10,000+</option>
            </Select>
          </div>

          <div>
            <p className="font-medium text-[var(--muted)] mb-1.5">Category</p>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as ScholarshipCategory | "any")}
            >
              <option value="any">Any category</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <p className="font-medium text-[var(--muted)] mb-1.5">Effort level</p>
            <Select
              value={effort}
              onChange={(e) => setEffort(e.target.value as EffortFilter)}
            >
              <option value="any">Any</option>
              <option value="low">Low (&lt; 1 hr)</option>
              <option value="medium">Medium (1–2 hrs)</option>
              <option value="high">High (2+ hrs)</option>
            </Select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hideExpired}
              onChange={(e) => setHideExpired(e.target.checked)}
              className="rounded border-[var(--border)] text-amber-500 focus:ring-amber-500/20"
            />
            <span className="text-[var(--text)]">Hide expired</span>
          </label>
        </div>
      </Drawer>
    </div>
  );
}
