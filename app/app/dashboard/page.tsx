"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PipelineBoard } from "@/components/feature/PipelineBoard";
import { LoadingScreenBlock } from "@/components/ui/LoadingScreen";
import { getApplications, ensureApplication } from "@/lib/applicationStorage";
import { getScholarships } from "@/lib/scholarshipStorage";
import { getProfile } from "@/lib/profileStorage";
import { computeMatchesForUser, getCachedMatches, invalidateMatchCache, GREENLIGHT_MIN_SCORE } from "@/lib/matchEngine";
import { parseEffortMinutes } from "@/lib/opportunityScore";
import { useUser } from "@/hooks/useUser";
import { decodeHtmlEntities, displayScholarshipTitle } from "@/lib/utils";
import type { Application, Scholarship } from "@/types";

function getDeadlinesForNextDays<T extends { deadline: string }>(
  applicationDeadlines: T[],
  days: number
): T[] {
  const now = new Date();
  const limit = new Date(now);
  limit.setDate(now.getDate() + days);
  return applicationDeadlines.filter((d) => {
    const date = new Date(d.deadline);
    return date >= now && date <= limit;
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const [applications, setApplications] = useState<Application[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [matchResults, setMatchResults] = useState<{ id: string; matchScore: number; eligibilityStatus: string; reasons: string[] }[]>([]);
  const [loading, setLoading] = useState(true);

  // Phase 1: Load applications first so the dashboard can paint quickly (especially on mobile).
  // Phase 2: Load scholarships in background so pipeline/stat details fill in; match runs deferred.
  const loadData = useCallback(async () => {
    const apps = await getApplications();
    setApplications(apps);
    setLoading(false);
    const schols = await getScholarships();
    setScholarships(schols);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const onFocus = () => { loadData(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadData]);

  // Defer match computation so it doesn't block the main thread (helps mobile stay responsive).
  useEffect(() => {
    if (!user?.uid || scholarships.length === 0) return;
    let cancelled = false;
    const run = async () => {
      const profile = await getProfile();
      if (cancelled) return;
      const cached = getCachedMatches(user.uid);
      if (cached && cached.length === scholarships.length) {
        setMatchResults(cached.map((r) => ({ id: r.scholarshipId, matchScore: r.matchScore, eligibilityStatus: r.eligibilityStatus, reasons: r.reasons ?? [] })));
        return;
      }
      const runMatch = () => {
        if (cancelled) return;
        computeMatchesForUser(user.uid, profile, scholarships).then((results) => {
          if (!cancelled) setMatchResults(results.map((r) => ({ id: r.scholarshipId, matchScore: r.matchScore, eligibilityStatus: r.eligibilityStatus, reasons: r.reasons ?? [] })));
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
  }, [user?.uid, scholarships]);

  type DeadlineStatus = "not_started" | "in_progress" | "submitted";
  type AppDeadline = { id: string; title: string; scholarshipId: string; deadline: string; status: DeadlineStatus };

  const applicationDeadlines: AppDeadline[] = useMemo(
    () =>
      applications
        .map((app) => {
          const s = scholarships.find((sch) => sch.id === app.scholarshipId);
          const deadlineStatus: DeadlineStatus =
            app.status === "submitted"
              ? "submitted"
              : app.status === "drafting" || app.status === "reviewing"
                ? "in_progress"
                : "not_started";
          return {
            id: app.id,
            title: displayScholarshipTitle(s?.title ?? "") || "Application",
            scholarshipId: app.scholarshipId,
            deadline: s?.deadline ?? "",
            status: deadlineStatus
          };
        })
        .filter((d) => d.deadline),
    [applications, scholarships]
  );

  const deadlinesThisWeek = useMemo(
    () => getDeadlinesForNextDays(applicationDeadlines, 7),
    [applicationDeadlines]
  );

  const inProgress = useMemo(
    () => applications.filter((a) => a.status !== "submitted").length,
    [applications]
  );
  const dueSoon = deadlinesThisWeek.length;
  const estimatedSum = useMemo(
    () =>
      applications
        .filter((a) => a.status === "submitted")
        .reduce((sum, a) => {
          const s = scholarships.find((sch) => sch.id === a.scholarshipId);
          return sum + (s?.amount ?? 0);
        }, 0),
    [applications, scholarships]
  );

  const applicationIds = useMemo(() => new Set(applications.map((a) => a.scholarshipId)), [applications]);
  // Same formula as scholarships page Greenlight: eligible or almost_eligible, score >= 70, exclude sweepstakes, exclude already applied
  const greenlightEligibleCount = useMemo(() => {
    return matchResults.filter((r) => {
      if (applicationIds.has(r.id)) return false;
      const scholarship = scholarships.find((s) => s.id === r.id);
      if (scholarship?.displayCategory === "sweepstakes") return false;
      const ok =
        (r.eligibilityStatus === "eligible" || r.eligibilityStatus === "almost_eligible") &&
        r.matchScore >= GREENLIGHT_MIN_SCORE;
      return ok;
    }).length;
  }, [matchResults, scholarships, applicationIds]);
  const topRecommended = useMemo(() => {
    const notStarted = scholarships.filter((s) => !applicationIds.has(s.id));
    const withScores = notStarted
      .map((s) => {
        const r = matchResults.find((m) => m.id === s.id);
        if (!r) return null;
        const ok = r.eligibilityStatus === "eligible" || r.eligibilityStatus === "almost_eligible" || (r.eligibilityStatus === "may_not_be_eligible" && r.matchScore >= 50);
        if (!ok) return null;
        return { scholarship: s, matchScore: r.matchScore, eligibilityStatus: r.eligibilityStatus, reasons: r.reasons ?? [] };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    withScores.sort((a, b) => b.matchScore - a.matchScore || (new Date(a.scholarship.deadline || "").getTime() - new Date(b.scholarship.deadline || "").getTime()));
    return withScores.slice(0, 3);
  }, [scholarships, applicationIds, matchResults]);

  // Weekly planning: same 3 as "Top recommended" so banner $ and cards $ match
  const weeklyPlanning = useMemo(() => {
    if (topRecommended.length < 2) return { count: 0, hours: 0, potentialSum: 0 };
    const take = topRecommended.slice(0, 3);
    const totalMinutes = take.reduce((acc, { scholarship }) => acc + parseEffortMinutes(scholarship.estimatedTime), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const potentialSum = take.reduce((acc, { scholarship }) => acc + (scholarship.amount ?? 0), 0);
    return { count: take.length, hours: totalHours, potentialSum };
  }, [topRecommended]);

  const pipelineCards = useMemo(
    () =>
      applications.map((app) => {
        const scholarship = scholarships.find((s) => s.id === app.scholarshipId);
        return {
          id: app.id,
          title: displayScholarshipTitle(scholarship?.title ?? "") || "Application",
          amount: scholarship?.amount,
          deadline: scholarship?.deadline,
          status: app.status,
          progress: app.progress,
          nextTask: app.nextTask,
          owlStatus: app.owlStatus,
          outcome: app.outcome,
        };
      }),
    [applications, scholarships]
  );

  const deadlinesIn14Days = useMemo(
    () => getDeadlinesForNextDays(applicationDeadlines, 14),
    [applicationDeadlines]
  );
  const potentialEligibleSum = useMemo(() => {
    return scholarships
      .filter((s) => !applicationIds.has(s.id))
      .filter((s) => {
        const r = matchResults.find((m) => m.id === s.id);
        return r && (r.eligibilityStatus === "eligible" || r.eligibilityStatus === "almost_eligible") && r.matchScore >= GREENLIGHT_MIN_SCORE;
      })
      .reduce((sum, s) => sum + (s.amount ?? 0), 0);
  }, [scholarships, applicationIds, matchResults]);
  const highestMatchPct = useMemo(() => {
    if (matchResults.length === 0) return null;
    const eligible = matchResults.filter(
      (r) => r.eligibilityStatus === "eligible" || r.eligibilityStatus === "almost_eligible"
    );
    if (eligible.length === 0) return null;
    return Math.max(...eligible.map((r) => r.matchScore));
  }, [matchResults]);

  const statCards = [
    {
      label: "Curated for you",
      value: greenlightEligibleCount,
      sub: "scholarships",
      zeroCopy: "No curated matches yet",
      zeroSub: "Add location + activities to grow your list.",
      zeroActionHref: "/app/profile",
      zeroActionLabel: "Improve profile",
      icon: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: "bg-emerald-500/10"
    },
    {
      label: "Due soon (7 days)",
      value: dueSoon,
      sub: applications.length > 0 ? `${applications.length} in pipeline` : null,
      icon: (
        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: "bg-red-500/10"
    },
    {
      label: "In progress",
      value: inProgress,
      sub: null,
      icon: (
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      iconBg: "bg-blue-500/10"
    },
    {
      label: "Estimated $ applied",
      value: `$${estimatedSum.toLocaleString()}`,
      sub: potentialEligibleSum > 0 ? `Up to $${(potentialEligibleSum / 1000).toFixed(0)}k more to discover` : null,
      icon: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: "bg-emerald-500/10"
    }
  ];

  if (loading) {
    return <LoadingScreenBlock message="Loading dashboard…" />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle={
          pipelineCards.length === 0
            ? greenlightEligibleCount > 0
              ? "Start an application from the list below or browse all."
              : "Browse scholarships to see matches and your pipeline here."
            : dueSoon > 0
              ? `${dueSoon} due this week — keep going.`
              : "Browse scholarships or continue your applications."
        }
        primaryAction={
          <Link
            href="/app/scholarships"
            className="btn-gold text-sm py-2 px-5"
          >
            {pipelineCards.length === 0 ? "Start your first application" : "Start application"}
          </Link>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 items-stretch">
        {statCards.map((stat, i) => {
          const isFirst = i === 0;
          const isMoney = i === 3;
          const showZeroState = isFirst && stat.value === 0 && "zeroCopy" in stat && (stat as { zeroCopy?: string }).zeroCopy;
          return (
          <Card
            key={stat.label}
            className={`h-full min-h-[96px] p-3 sm:p-4 flex overflow-hidden ${isFirst ? "ring-1 ring-emerald-500/20 bg-emerald-500/5" : ""}`}
          >
            <div className="flex items-stretch gap-2 sm:gap-3 min-w-0 w-full flex-1 overflow-hidden">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 ${stat.iconBg} rounded-lg flex items-center justify-center shrink-0`}>
                {stat.icon}
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5 py-0.5 overflow-hidden">
                <p className="text-[11px] sm:text-xs text-[var(--muted-2)] leading-tight shrink-0">{stat.label}</p>
                {showZeroState ? (
                  <>
                    <p className="text-base sm:text-lg font-bold font-heading leading-tight">{(stat as { zeroCopy: string }).zeroCopy}</p>
                    <p className="text-[11px] text-[var(--muted-2)] leading-tight">{(stat as { zeroSub?: string }).zeroSub}</p>
                    <Link
                      href={(stat as { zeroActionHref?: string }).zeroActionHref ?? "/app/profile"}
                      className="mt-1 inline-block text-xs font-medium text-emerald-400 hover:text-emerald-300 leading-tight"
                    >
                      {(stat as { zeroActionLabel?: string }).zeroActionLabel ?? "Improve profile"} →
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-2xl sm:text-3xl font-bold font-heading tabular-nums leading-tight">
                      {typeof stat.value === "number" ? stat.value : stat.value}
                    </p>
                    {isFirst && stat.sub === "scholarships" ? (
                      <p className="text-[11px] sm:text-xs text-[var(--muted-2)] leading-tight">{stat.sub}</p>
                    ) : null}
                    {stat.sub != null && stat.sub !== "scholarships" && (
                      <p className={`text-[11px] leading-tight ${isMoney ? "font-medium text-emerald-400 dark:text-emerald-300" : "text-[var(--muted-2)]"}`}>{stat.sub}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </Card>
          );
        })}
      </div>

      {weeklyPlanning.count >= 2 && weeklyPlanning.potentialSum > 0 && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 px-4 py-3">
          <p className="text-sm font-semibold text-amber-400">
            If you apply to these {weeklyPlanning.count} recommended scholarship{weeklyPlanning.count === 1 ? "" : "s"} this week:
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Estimated <strong className="text-[var(--text)]">{weeklyPlanning.hours} hours</strong>
            {" · "}
            Potential ROI: <strong className="text-emerald-500 dark:text-emerald-400">${weeklyPlanning.potentialSum.toLocaleString()}</strong>
          </p>
        </div>
      )}

      {topRecommended.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[var(--muted)]">
            Top recommended for you
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topRecommended.map(({ scholarship, matchScore, reasons }) => (
              <Card key={scholarship.id} className="p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-[var(--text)] text-sm line-clamp-2">
                    {displayScholarshipTitle(scholarship.title)}
                  </h3>
                  <span className="shrink-0 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-2 py-0.5">
                    {matchScore}%
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[var(--muted-2)]">
                  {matchScore >= 70 ? "Strong match" : matchScore >= 50 ? "Good match" : "Match"}
                  {reasons.length > 0 && ` · Based on ${reasons.slice(0, 2).join(", ")}`}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--muted-2)]">
                  {scholarship.deadline && (
                    <span>Due {new Date(scholarship.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                  )}
                  {scholarship.amount != null && scholarship.amount > 0 && (
                    <span>${scholarship.amount.toLocaleString()}</span>
                  )}
                </div>
                <Button
                  className="mt-3 w-full btn-gold text-sm py-1.5"
                  onClick={async () => {
                    const app = await ensureApplication(scholarship.id);
                    router.push(`/app/applications/${app.id}`);
                  }}
                >
                  Start
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--muted)]">
          Applications pipeline
        </h2>
        {pipelineCards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6 text-center">
            <p className="text-sm text-[var(--muted)]">
              {greenlightEligibleCount > 0 ? "Pick one above or browse all to get started." : "Start an application to see it here."}
            </p>
            <Link
              href="/app/scholarships"
              className="btn-gold mt-3 inline-flex text-sm py-2 px-4"
            >
              Browse scholarships
            </Link>
          </div>
        ) : (
          <PipelineBoard
            applications={pipelineCards}
            getCardHref={(applicationId) => `/app/applications/${applicationId}`}
          />
        )}
      </div>

    </div>
  );
}
