"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Skeleton } from "@/components/ui/Skeleton";
import { ScholarshipRowCard } from "@/components/feature/ScholarshipRowCard";
import { fetchScholarshipsPage } from "@/lib/scholarshipApi";
import { getScholarships, invalidateScholarshipCache } from "@/lib/scholarshipStorage";
import { getApplications, ensureApplication } from "@/lib/applicationStorage";
import { getProfile } from "@/lib/profileStorage";
import { classifyScholarship } from "@/lib/classifyScholarship";
import { isSweepstakes } from "@/lib/scholarshipQuality";
import {
  computeMatchesForUser,
  getCachedMatches,
  invalidateMatchCache,
  GREENLIGHT_MIN_SCORE,
  NEAR_MATCH_MIN_SCORE,
} from "@/lib/matchEngine";
import { getProfileCompletion, getMissingItemsForMatchUnlock } from "@/lib/profileCompletion";
import { useUser } from "@/hooks/useUser";
import type { Scholarship, ScholarshipCategory, ScholarshipMatchResult } from "@/types";

type SortOption = "best_match" | "soonest" | "amount" | "latest" | "lowest" | "title" | "effort_high" | "effort_low" | "best_roi";
type TypeFilter = "all" | "non_citizen" | "private" | "government";
type DisplayCategoryFilter = "all" | "scholarships_only" | "sweepstakes_only";
type DeadlineFilter = "any" | "7" | "30" | "60" | "90";
type AmountFilter = "any" | "1000" | "2000" | "5000" | "10000";
type EffortFilter = "any" | "low" | "medium" | "high";

function formatTimeAgo(ms: number): string {
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.floor(hr / 24);
  return `${d} day${d !== 1 ? "s" : ""} ago`;
}

function parseEffort(estimatedTime: string): "low" | "medium" | "high" {
  const t = (estimatedTime || "").toLowerCase();
  if (t.includes("4+") || t.includes("3–4") || t.includes("3-4")) return "high";
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
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q") ?? "";
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("soonest");
  const [deadlineDays, setDeadlineDays] = useState<DeadlineFilter>("any");
  const [minAmount, setMinAmount] = useState<AmountFilter>("any");
  const [category, setCategory] = useState<ScholarshipCategory | "any">("any");
  const [effort, setEffort] = useState<EffortFilter>("any");
  const [hideExpired, setHideExpired] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [displayCategoryFilter, setDisplayCategoryFilter] = useState<DisplayCategoryFilter>("scholarships_only");
  const [greenlightOn, setGreenlightOn] = useState(false);
  const [showNearMatches, setShowNearMatches] = useState(false);
  const [matchResults, setMatchResults] = useState<ScholarshipMatchResult[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [items, setItems] = useState<Scholarship[]>([]);
  const [applicationIds, setApplicationIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const { user } = useUser();

  const loadScholarships = useCallback(async (invalidate = false) => {
    if (invalidate) {
      invalidateScholarshipCache();
      if (user?.uid) invalidateMatchCache(user.uid);
    }
    setLoading(true);
    try {
      const [dataRes, apps] = await Promise.all([
        fetchScholarshipsPage({ limit: 20 }),
        getApplications(),
      ]);
      setItems(dataRes.items);
      setNextCursor(dataRes.nextCursor);
      setApplicationIds(new Set(apps.map((a) => a.scholarshipId)));
    } catch {
      setItems([]);
      setNextCursor(null);
    }
    setLastRefreshedAt(Date.now());
    setLoading(false);
  }, [user?.uid]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetchScholarshipsPage({ limit: 20, cursor: nextCursor });
      setItems((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  useEffect(() => {
    loadScholarships();
  }, [loadScholarships]);

  useEffect(() => {
    if (!user?.uid || items.length === 0) return;
    let cancelled = false;
    const run = async () => {
      const profile = await getProfile();
      if (cancelled) return;
      const cached = getCachedMatches(user.uid);
      if (cached && cached.length === items.length) {
        setMatchResults(cached);
        return;
      }
      const runMatch = () => {
        if (cancelled) return;
        computeMatchesForUser(user.uid, profile, items).then((results) => {
          if (!cancelled) setMatchResults(results);
        });
      };
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(runMatch, { timeout: 600 });
      } else {
        setTimeout(runMatch, 0);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [user?.uid, items]);

  useEffect(() => {
    if (qFromUrl !== "" && qFromUrl !== query) setQuery(qFromUrl);
  }, [qFromUrl]);

  const filtered = useMemo(() => {
    const now = new Date();
    const deadlineCutoff =
      deadlineDays !== "any"
        ? new Date(now.getTime() + parseInt(deadlineDays, 10) * 24 * 60 * 60 * 1000)
        : null;
    const minAmountNum = minAmount !== "any" ? parseInt(minAmount, 10) : 0;

    return items.filter((s) => {
      if (s.status === "draft") return false;
      const isSweepstakesItem = s.displayCategory === "sweepstakes" || (s.displayCategory == null && isSweepstakes(s));
      if (displayCategoryFilter === "scholarships_only" && isSweepstakesItem) return false;
      if (displayCategoryFilter === "sweepstakes_only" && !isSweepstakesItem) return false;
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
  }, [items, query, deadlineDays, minAmount, category, effort, hideExpired, applicationIds, typeFilter, displayCategoryFilter]);

  const matchResultsMap = useMemo(() => {
    const m = new Map<string, ScholarshipMatchResult>();
    matchResults.forEach((r) => m.set(r.scholarshipId, r));
    return m;
  }, [matchResults]);

  const profileNudges = useMemo(() => {
    if (!greenlightOn) return { state: 0 };
    let state = 0;
    filtered.forEach((s) => {
      const m = matchResultsMap.get(s.id);
      if (!m) return;
      const missing = m.missingRequirements ?? [];
      if (missing.some((r) => r.toLowerCase().includes("state"))) state++;
    });
    return { state };
  }, [greenlightOn, filtered, matchResultsMap]);

  const greenlightFiltered = useMemo(() => {
    if (!greenlightOn) return filtered;
    const minScore = showNearMatches ? NEAR_MATCH_MIN_SCORE : GREENLIGHT_MIN_SCORE;
    return filtered.filter((s) => {
      if (s.displayCategory === "sweepstakes") return false;
      const match = matchResultsMap.get(s.id);
      if (!match) return false;
      const strongEligible = (match.eligibilityStatus === "eligible" || match.eligibilityStatus === "almost_eligible") && match.matchScore >= GREENLIGHT_MIN_SCORE;
      const nearEligible = (match.eligibilityStatus === "may_not_be_eligible" || match.eligibilityStatus === "almost_eligible") && match.matchScore >= NEAR_MATCH_MIN_SCORE && match.matchScore < GREENLIGHT_MIN_SCORE;
      if (showNearMatches) return strongEligible || nearEligible;
      return strongEligible;
    });
  }, [filtered, greenlightOn, showNearMatches, matchResultsMap]);

  const effortMinutes = useCallback((s: Scholarship): number => {
    const t = (s.estimatedTime ?? "").toLowerCase();
    if (t.includes("min") && /\d+/.test(t)) return parseInt(t.match(/\d+/)?.[0] ?? "30", 10) || 30;
    if (t.includes("hour") && /\d+/.test(t)) return (parseInt(t.match(/\d+/)?.[0] ?? "1", 10) || 1) * 60;
    if (t.includes("4+") || t.includes("3–4") || t.includes("3-4")) return 240;
    return 60;
  }, []);

  const sorted = useMemo(() => {
    const list = greenlightOn ? [...greenlightFiltered] : [...filtered];
    const getDeadline = (s: Scholarship) => (s.deadline ? new Date(s.deadline).getTime() : 0);
    const getAmount = (s: Scholarship) => s.amount ?? 0;
    const getMatchScore = (s: Scholarship) => matchResultsMap.get(s.id)?.matchScore ?? 0;
    const getROI = (s: Scholarship) => {
      const amt = getAmount(s);
      const mins = effortMinutes(s);
      return mins > 0 ? amt / mins : 0;
    };
    if (greenlightOn) {
      list.sort((a, b) => {
        const sa = getMatchScore(a);
        const sb = getMatchScore(b);
        if (sb !== sa) return sb - sa;
        if (sortBy === "amount") return getAmount(b) - getAmount(a);
        if (sortBy === "best_roi") return getROI(b) - getROI(a);
        if (sortBy === "effort_low") return effortRank(parseEffort(a.estimatedTime || "")) - effortRank(parseEffort(b.estimatedTime || ""));
        return getDeadline(a) - getDeadline(b);
      });
    } else {
      if (sortBy === "best_match") list.sort((a, b) => getMatchScore(b) - getMatchScore(a) || getDeadline(a) - getDeadline(b));
      else if (sortBy === "soonest") list.sort((a, b) => getDeadline(a) - getDeadline(b));
      else if (sortBy === "latest") list.sort((a, b) => getDeadline(b) - getDeadline(a));
      else if (sortBy === "amount") list.sort((a, b) => getAmount(b) - getAmount(a));
      else if (sortBy === "lowest") list.sort((a, b) => getAmount(a) - getAmount(b));
      else if (sortBy === "title") list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      else if (sortBy === "effort_high") list.sort((a, b) => effortRank(parseEffort(b.estimatedTime || "")) - effortRank(parseEffort(a.estimatedTime || "")));
      else if (sortBy === "effort_low") list.sort((a, b) => effortRank(parseEffort(a.estimatedTime || "")) - effortRank(parseEffort(b.estimatedTime || "")));
      else if (sortBy === "best_roi") list.sort((a, b) => getROI(b) - getROI(a));
    }
    return list;
  }, [greenlightFiltered, filtered, greenlightOn, sortBy, matchResultsMap, effortMinutes]);

  const featured = useMemo(() => sorted.filter((s) => s.featured), [sorted]);
  const nonFeatured = useMemo(() => sorted.filter((s) => !s.featured), [sorted]);
  const displayList = useMemo(() => [...featured, ...nonFeatured], [featured, nonFeatured]);
  const totalPages = Math.ceil(displayList.length / perPage) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return displayList.slice(start, start + perPage);
  }, [displayList, page, perPage]);

  useEffect(() => {
    setPage(1);
  }, [query, sortBy, deadlineDays, minAmount, category, effort, hideExpired, typeFilter, displayCategoryFilter]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadScholarships(true);
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
        subtitle={greenlightOn ? "Scholarships you qualify for." : "Explore scholarships across the country."}
        primaryAction={
          <div className="flex flex-wrap items-center gap-2">
            {lastRefreshedAt != null && (
              <span className="text-[11px] text-[var(--muted-2)]">
                Last updated {formatTimeAgo(lastRefreshedAt)}
              </span>
            )}
            <Link
              href="/app/submit"
              className="inline-flex items-center rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text)] hover:border-amber-500/30 hover:text-amber-400 transition-colors"
            >
              Submit a scholarship
            </Link>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
            >
              {refreshing ? "Syncing…" : "Run new sync"}
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setGreenlightOn((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-full text-sm font-semibold transition-all ${
            greenlightOn
              ? "px-5 py-3 bg-emerald-500/25 text-emerald-400 border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/15 ring-2 ring-emerald-400/20 animate-pulse"
              : "px-4 py-2.5 bg-[var(--surface)] text-[var(--muted)] border-2 border-[var(--border)] hover:border-emerald-500/30 hover:text-[var(--text)]"
          }`}
        >
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Greenlight{greenlightOn && greenlightFiltered.length >= 0 ? ` (${greenlightFiltered.length})` : ""}
        </button>
        {greenlightOn && (
          <p className="text-xs text-[var(--muted)]">
            Showing {greenlightFiltered.length} scholarship{greenlightFiltered.length === 1 ? "" : "s"} you&apos;re eligible for.
          </p>
        )}
      </div>

      {greenlightOn && filtered.length > 0 && (
        <p className="text-xs text-[var(--muted-2)]">
          Based on your profile, we filtered {filtered.length} scholarship{filtered.length === 1 ? "" : "s"} down to {greenlightFiltered.length} high-confidence match{greenlightFiltered.length === 1 ? "" : "es"}.
        </p>
      )}
      {greenlightOn && profileNudges.state > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {profileNudges.state > 0 && (
            <Link href="/app/profile" className="text-emerald-500 hover:underline">
              Add your state to unlock up to {profileNudges.state} more match{profileNudges.state === 1 ? "" : "es"}
            </Link>
          )}
          <Link href="/app/profile" className="text-[var(--muted-2)] hover:text-[var(--text)]">
            Add intended major to refine results
          </Link>
        </div>
      )}

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
              onClick={() => { setTypeFilter(opt.value); setPage(1); }}
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
        <div className="flex w-full flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3">
          <span className="text-xs font-medium text-[var(--muted)]">Catalog:</span>
          {[
            { value: "scholarships_only" as DisplayCategoryFilter, label: "Scholarships only" },
            { value: "sweepstakes_only" as DisplayCategoryFilter, label: "Sweepstakes only" },
            { value: "all" as DisplayCategoryFilter, label: "All" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { setDisplayCategoryFilter(opt.value); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                displayCategoryFilter === opt.value
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
          className="w-48"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
        >
          <option value="best_match">Best match</option>
          <option value="soonest">Soonest deadline</option>
          <option value="amount">Highest award</option>
          <option value="best_roi">Best ROI</option>
          <option value="effort_low">Lowest effort</option>
          <option value="latest">Latest deadline</option>
          <option value="lowest">Lowest amount</option>
          <option value="effort_high">Highest effort</option>
          <option value="title">Title A–Z</option>
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
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={(e) => {
            setQuery("");
            setSortBy("soonest");
            setDeadlineDays("any");
            setMinAmount("any");
            setCategory("any");
            setEffort("any");
            setTypeFilter("all");
            setDisplayCategoryFilter("scholarships_only");
            setGreenlightOn(false);
            setShowNearMatches(false);
            setHideExpired(true);
            setPage(1);
            (e.currentTarget as HTMLButtonElement).blur();
          }}
          className="outline-none focus:outline-none focus:ring-0"
        >
          Clear all
        </Button>
        </div>
      </div>

      {displayList.length > 0 && (
        <p className="text-sm text-[var(--muted)]">
          Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, displayList.length)} of {displayList.length} scholarships
          {featured.length > 0 && (
            <span className="ml-2 text-amber-400">{featured.length} featured</span>
          )}
        </p>
      )}

      <div className="space-y-4">
        {displayList.length === 0 ? (
          greenlightOn ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
              <p className="text-base font-semibold text-[var(--text)]">No Greenlight matches yet</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Add profile details to unlock matches, or browse all scholarships.
              </p>
              <p className="mt-1 text-xs text-[var(--muted-2)]">Based on your profile we couldn&apos;t find 70%+ matches yet. Add your state, education level, or major to see more.</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {!showNearMatches ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowNearMatches(true)}
                  >
                    Show Near Matches (50–69%)
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowNearMatches(false)}
                  >
                    Hide Near Matches
                  </Button>
                )}
                <Link href="/app/profile">
                  <Button type="button" variant="primary" size="sm">
                    Add profile details
                  </Button>
                </Link>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setGreenlightOn(false)}
                >
                  Browse all scholarships
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
              <p className="text-base font-semibold text-[var(--text)]">No scholarships match your filters</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Try a different search or clear filters. Or turn on Greenlight to see ones you qualify for.</p>
              <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={() => setGreenlightOn(true)}>
                Turn on Greenlight
              </Button>
            </div>
          )
        ) : (
          paginated.map((scholarship) => (
            <ScholarshipRowCard
              key={scholarship.id}
              scholarship={scholarship}
              hasApplication={false}
              onStartApplication={handleStartApplication}
              matchResult={greenlightOn ? matchResultsMap.get(scholarship.id) : undefined}
              greenlightHighlight={greenlightOn}
            />
          ))
        )}
      </div>

      {nextCursor != null && (
        <div className="flex justify-center py-4">
          <Button
            type="button"
            variant="secondary"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load more scholarships"}
          </Button>
        </div>
      )}

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
