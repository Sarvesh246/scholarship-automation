"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { LoadingScreenBlock } from "@/components/ui/LoadingScreen";
import { ScholarshipRowCard } from "@/components/feature/ScholarshipRowCard";
import { fetchScholarshipsPage } from "@/lib/scholarshipApi";
import { getScholarships, invalidateScholarshipCache } from "@/lib/scholarshipStorage";
import { getApplications, ensureApplication } from "@/lib/applicationStorage";
import { getProfile } from "@/lib/profileStorage";
import { auth } from "@/lib/firebase";
import { classifyScholarship } from "@/lib/classifyScholarship";
import { isSweepstakes, MIN_SCORE_HIGH_QUALITY_ONLY } from "@/lib/scholarshipQuality";
import {
  computeMatchesForUser,
  getCachedMatches,
  invalidateMatchCache,
  profileHasAnyMatchData,
  GREENLIGHT_MIN_SCORE,
  NEAR_MATCH_MIN_SCORE,
} from "@/lib/matchEngine";
import { getROIScore, getOpportunityScore, isHighROI, percentile80, getFreshnessTimestamp } from "@/lib/opportunityScore";
import { useUser } from "@/hooks/useUser";
import type { Scholarship, ScholarshipCategory, ScholarshipMatchResult, Profile } from "@/types";

type SortOption = "opportunity" | "soonest" | "best_match" | "amount";
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
  const matchDebug = searchParams.get("debug") === "1";
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("best_match");
  const [deadlineDays, setDeadlineDays] = useState<DeadlineFilter>("any");
  const [minAmount, setMinAmount] = useState<AmountFilter>("any");
  const [category, setCategory] = useState<ScholarshipCategory | "any">("any");
  const [effort, setEffort] = useState<EffortFilter>("any");
  const [hideExpired, setHideExpired] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [displayCategoryFilter, setDisplayCategoryFilter] = useState<DisplayCategoryFilter>("scholarships_only");
  const [greenlightOn, setGreenlightOn] = useState(false);
  const [showNearMatches, setShowNearMatches] = useState(false);
  const [hideUnknownEligibility, setHideUnknownEligibility] = useState(false);
  const [highQualityOnly, setHighQualityOnly] = useState(false);
  const [matchResults, setMatchResults] = useState<ScholarshipMatchResult[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [greenlightHelpOpen, setGreenlightHelpOpen] = useState(false);
  const [items, setItems] = useState<Scholarship[]>([]);
  const [applicationIds, setApplicationIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [profileSummary, setProfileSummary] = useState<{ hasState: boolean; hasMajor: boolean } | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState<Error | null>(null);
  const [, setTimeAgoTick] = useState(0);
  const itemsLengthRef = useRef(0);

  const { user } = useUser();

  /** Re-render periodically so "Last updated X ago" stays current. */
  useEffect(() => {
    if (lastRefreshedAt == null) return;
    const interval = setInterval(() => setTimeAgoTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, [lastRefreshedAt]);

  const loadScholarships = useCallback(async (invalidate = false) => {
    if (invalidate) {
      invalidateScholarshipCache();
      const uid = user?.uid ?? "anonymous";
      invalidateMatchCache(uid);
    }
    setLoading(true);
    try {
      const [dataRes, apps] = await Promise.all([
        fetchScholarshipsPage({ limit: 100 }),
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
      const res = await fetchScholarshipsPage({ limit: 100, cursor: nextCursor });
      setItems((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  useEffect(() => {
    loadScholarships();
  }, [loadScholarships]);

  /** After initial load, auto-fetch remaining pages so the list shows all quality-passing scholarships. */
  useEffect(() => {
    if (loading || loadingMore || !nextCursor) return;
    loadMore();
  }, [loading, loadingMore, nextCursor, loadMore]);

  useEffect(() => {
    if (items.length === 0) return;
    itemsLengthRef.current = items.length;
    const userId = user?.uid ?? "anonymous";
    let cancelled = false;
    const run = async () => {
      setProfileLoaded(false);
      setProfileError(null);
      let profile: Profile;
      try {
        profile = await getProfile();
        setProfileLoaded(true);
        console.log("uid:", auth?.currentUser?.uid);
        console.log("profile:", profile);
        console.log("profileLoaded:", true);
        console.log("profileError:", null);
      } catch (e) {
        setProfileError(e instanceof Error ? e : new Error(String(e)));
        setProfileLoaded(true);
        console.log("uid:", auth?.currentUser?.uid);
        console.log("profile:", undefined);
        console.log("profileLoaded:", true);
        console.log("profileError:", e);
        return;
      }
      if (cancelled) return;
      setProfileSummary({
        hasState: !!(profile.location?.state?.trim() ?? profile.demographics?.state?.trim()),
        hasMajor: !!(
          (profile.intendedMajors?.length ?? 0) > 0 ||
          (profile.academics?.major ?? "").trim() !== "" ||
          (profile.majorsFreeText ?? "").trim() !== ""
        ),
      });
      const cached = getCachedMatches(userId);
      if (cached && cached.length === items.length && !matchDebug && profileHasAnyMatchData(profile)) {
        setMatchResults(cached);
        return;
      }
      computeMatchesForUser(userId, profile, items, { includeBreakdown: matchDebug })
        .then((results) => {
          if (cancelled) return;
          if (results.length !== itemsLengthRef.current) return;
          setMatchResults(results);
          if (typeof window !== "undefined" && (matchDebug || process.env.NODE_ENV === "development") && results.length > 0) {
            const first = results[0];
            console.log("[Scholarships] Match debug:", {
              userId,
              profileSnapshot: { educationLevel: profile.educationLevel, state: profile.location?.state ?? profile.demographics?.state, majors: profile.intendedMajors ?? profile.academics?.major },
              firstResult: { scholarshipId: first.scholarshipId, matchPercent: first.matchPercent, matchScore: first.matchScore, reasonsCount: first.reasons?.length },
            });
          }
        })
        .catch(() => {});
    };
    run();
    return () => { cancelled = true; };
  }, [user?.uid, items, matchDebug]);

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
      if (highQualityOnly) {
        const score = s.qualityScore ?? 0;
        if (score < MIN_SCORE_HIGH_QUALITY_ONLY || s.riskFlags?.includes("potential_risk")) return false;
      }
      return true;
    });
  }, [items, query, deadlineDays, minAmount, category, effort, hideExpired, applicationIds, typeFilter, displayCategoryFilter, highQualityOnly]);

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
      if (match.eligibilityStatus === "ineligible") return false;
      if (hideUnknownEligibility && match.eligibilityStatus === "unknown") return false;
      const pct = match.matchPercent ?? match.matchScore;
      const strongEligible = (match.eligibilityStatus === "eligible" || match.eligibilityStatus === "almost_eligible") && pct >= GREENLIGHT_MIN_SCORE;
      const nearEligible = (match.eligibilityStatus === "may_not_be_eligible" || match.eligibilityStatus === "almost_eligible") && pct >= NEAR_MATCH_MIN_SCORE && pct < GREENLIGHT_MIN_SCORE;
      const unknownOk = match.eligibilityStatus === "unknown" && pct >= minScore;
      if (showNearMatches) return strongEligible || nearEligible || unknownOk;
      return strongEligible || unknownOk;
    });
  }, [filtered, greenlightOn, showNearMatches, hideUnknownEligibility, matchResultsMap]);

  const greenlightTotalAmount = useMemo(() => {
    if (!greenlightOn || greenlightFiltered.length === 0) return 0;
    return greenlightFiltered.reduce((sum, s) => sum + (s.amount ?? 0), 0);
  }, [greenlightOn, greenlightFiltered]);

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
    const getMatchScore = (s: Scholarship) => matchResultsMap.get(s.id)?.matchPercent ?? matchResultsMap.get(s.id)?.matchScore ?? 0;
    const getROI = (s: Scholarship) => getROIScore(s, matchResultsMap.get(s.id)?.matchScore);
    const getOpportunity = (s: Scholarship) => getOpportunityScore(s);
    const getFreshness = (s: Scholarship) => getFreshnessTimestamp(s);
    if (greenlightOn) {
      list.sort((a, b) => {
        const sa = getMatchScore(a);
        const sb = getMatchScore(b);
        if (sb !== sa) return sb - sa;
        if (sortBy === "amount") return getAmount(b) - getAmount(a) || getFreshness(b) - getFreshness(a);
        if (sortBy === "opportunity") return getOpportunity(b) - getOpportunity(a) || getFreshness(b) - getFreshness(a);
        return getDeadline(a) - getDeadline(b) || getFreshness(b) - getFreshness(a);
      });
    } else {
      if (sortBy === "best_match") list.sort((a, b) => getMatchScore(b) - getMatchScore(a) || getDeadline(a) - getDeadline(b) || getFreshness(b) - getFreshness(a));
      else if (sortBy === "opportunity") list.sort((a, b) => getOpportunity(b) - getOpportunity(a) || getFreshness(b) - getFreshness(a));
      else if (sortBy === "soonest") list.sort((a, b) => getDeadline(a) - getDeadline(b) || getFreshness(b) - getFreshness(a));
      else if (sortBy === "amount") list.sort((a, b) => getAmount(b) - getAmount(a) || getFreshness(b) - getFreshness(a));
    }
    return list;
  }, [greenlightFiltered, filtered, greenlightOn, sortBy, matchResultsMap]);

  const featured = useMemo(() => sorted.filter((s) => s.featured), [sorted]);
  const nonFeatured = useMemo(() => sorted.filter((s) => !s.featured), [sorted]);
  const displayList = useMemo(() => [...featured, ...nonFeatured], [featured, nonFeatured]);
  const totalPages = Math.ceil(displayList.length / perPage) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return displayList.slice(start, start + perPage);
  }, [displayList, page, perPage]);

  const roi80 = useMemo(() => {
    const scores = displayList.map((s) => getROIScore(s, matchResultsMap.get(s.id)?.matchScore));
    return percentile80(scores);
  }, [displayList, matchResultsMap]);

  useEffect(() => {
    setPage(1);
  }, [query, sortBy, deadlineDays, minAmount, category, effort, hideExpired, typeFilter, displayCategoryFilter, greenlightOn, showNearMatches, hideUnknownEligibility]);

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
    return <LoadingScreenBlock message="Loading scholarships…" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scholarships"
        subtitle={greenlightOn ? "Your curated experience — scholarships matched to you." : "Explore scholarships across the country."}
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
              Add your scholarship
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
        <button
          type="button"
          onClick={() => setGreenlightHelpOpen(true)}
          className="text-xs font-medium text-[var(--muted)] hover:text-emerald-400 transition-colors underline underline-offset-2"
        >
          What is Greenlight?
        </button>
        {greenlightOn && (
          <p className="text-xs text-[var(--muted)]">
            Your curated list: {greenlightFiltered.length} opportunit{greenlightFiltered.length === 1 ? "y" : "ies"} for you.
          </p>
        )}
        {greenlightOn && greenlightFiltered.length > 0 && (
          <p className="text-sm font-semibold text-emerald-400">
            Total available: {greenlightTotalAmount > 0
              ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(greenlightTotalAmount)
              : "—"}
          </p>
        )}
      </div>

      <Modal
        open={greenlightHelpOpen}
        title="What is Greenlight?"
        onClose={() => setGreenlightHelpOpen(false)}
        primaryLabel="Got it"
        onPrimary={() => setGreenlightHelpOpen(false)}
      >
        <div className="space-y-4 text-[var(--text)] leading-relaxed">
          <p className="text-[15px]">
            Greenlight is a personal curated mode that uses your profile to tailor the entire scholarship experience for you. We surface opportunities that match your background, pass our quality standards, and offer strong value — so you can focus on applying, not searching.
          </p>
          <p className="text-sm text-[var(--muted)]">
            Your profile (state, major, education level, and more) drives the curation. We exclude low-quality or risky listings and factor in award amount and effort. The result is a focused list built for you, updated as you update your profile.
          </p>
          <p className="text-xs text-[var(--muted-2)]">
            Scholarships we can’t fully verify (missing data) are included by default. Use “Hide scholarships with unknown eligibility” if you want only confirmed-eligible items.
          </p>
        </div>
      </Modal>

      {greenlightOn && filtered.length > 0 && (
        <p className="text-xs text-[var(--muted-2)]">
          From the full catalog, we curated {greenlightFiltered.length} opportunit{greenlightFiltered.length === 1 ? "y" : "ies"} for you.
        </p>
      )}
      {greenlightOn && (profileNudges.state > 0 || (profileSummary && !profileSummary.hasMajor)) && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {profileNudges.state > 0 && profileSummary && !profileSummary.hasState && (
            <Link href="/app/profile" className="text-emerald-500 hover:underline">
              Add your state to include up to {profileNudges.state} more in your curated list
            </Link>
          )}
          {profileSummary && !profileSummary.hasMajor && (
            <Link href="/app/profile" className="text-[var(--muted-2)] hover:text-[var(--text)]">
              Add intended major to refine your curated list
            </Link>
          )}
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
          <option value="opportunity">Highest opportunity</option>
          <option value="soonest">Soonest deadline</option>
          <option value="amount">Highest award</option>
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
        <button
          type="button"
          onClick={() => { setHighQualityOnly((v) => !v); setPage(1); }}
          title="Show only high-quality listings (verified, clear sponsor, no risk flags)"
          className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
            highQualityOnly
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "border border-[var(--border)] text-[var(--muted)] hover:border-amber-500/30 hover:text-[var(--text)]"
          }`}
        >
          Higher quality only
        </button>
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
            setSortBy("best_match");
            setDeadlineDays("any");
            setMinAmount("any");
            setCategory("any");
            setEffort("any");
            setTypeFilter("all");
            setDisplayCategoryFilter("scholarships_only");
            setGreenlightOn(false);
            setShowNearMatches(false);
            setHideUnknownEligibility(false);
            setHideExpired(true);
            setHighQualityOnly(false);
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
              <p className="text-base font-semibold text-[var(--text)]">Your curated list is empty</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Add profile details so we can personalize your experience, or browse the full catalog.
              </p>
              <p className="mt-1 text-xs text-[var(--muted-2)]">We didn&apos;t find strong fits yet. Add your state, education level, or major to grow your list.</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {!showNearMatches ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowNearMatches(true)}
                  >
                    Show Near Matches (40–49%)
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
                <label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--muted)]">
                  <input
                    type="checkbox"
                    checked={hideUnknownEligibility}
                    onChange={(e) => setHideUnknownEligibility(e.target.checked)}
                    className="rounded border-[var(--border)] text-amber-500 focus:ring-amber-500/20"
                  />
                  Hide scholarships with unknown eligibility
                </label>
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
              <p className="mt-1 text-sm text-[var(--muted)]">Try a different search or clear filters. Or turn on Greenlight for a personalized, curated list built for you.</p>
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
              matchResult={matchResultsMap.get(scholarship.id)}
              greenlightHighlight={greenlightOn}
              showHighROI={isHighROI(getROIScore(scholarship, matchResultsMap.get(scholarship.id)?.matchScore), { percentile80: roi80 })}
              showMatchBreakdown={matchDebug}
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
              onClick={() => setPage(1)}
              disabled={page <= 1}
              title="First page"
            >
              First
            </Button>
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
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              title="Last page"
            >
              Last
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

          <div>
            <p className="font-medium text-[var(--muted)] mb-1.5">Quality</p>
            <button
              type="button"
              onClick={() => { setHighQualityOnly((v) => !v); setPage(1); setDrawerOpen(false); }}
              className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left ${
                highQualityOnly
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "border border-[var(--border)] text-[var(--muted)] hover:border-amber-500/30 hover:text-[var(--text)]"
              }`}
            >
              {highQualityOnly ? "✓ Higher quality only" : "Higher quality only"}
            </button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
