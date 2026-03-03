"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PipelineBoard } from "@/components/feature/PipelineBoard";
import { Skeleton } from "@/components/ui/Skeleton";
import { getApplications, ensureApplication } from "@/lib/applicationStorage";
import { getScholarships } from "@/lib/scholarshipStorage";
import { getProfile } from "@/lib/profileStorage";
import { computeMatchesForUser, getCachedMatches, invalidateMatchCache, GREENLIGHT_MIN_SCORE } from "@/lib/matchEngine";
import { useUser } from "@/hooks/useUser";
import { decodeHtmlEntities } from "@/lib/utils";
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
  const [matchResults, setMatchResults] = useState<{ id: string; matchScore: number; eligibilityStatus: string }[]>([]);
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
        setMatchResults(cached.map((r) => ({ id: r.scholarshipId, matchScore: r.matchScore, eligibilityStatus: r.eligibilityStatus })));
        return;
      }
      const runMatch = () => {
        if (cancelled) return;
        computeMatchesForUser(user.uid, profile, scholarships).then((results) => {
          if (!cancelled) setMatchResults(results.map((r) => ({ id: r.scholarshipId, matchScore: r.matchScore, eligibilityStatus: r.eligibilityStatus })));
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
            title: s?.title ?? "Application",
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
        .filter((a) => a.status !== "not_started" && a.status !== "submitted")
        .reduce((sum, a) => {
          const s = scholarships.find((sch) => sch.id === a.scholarshipId);
          return sum + (s?.amount ?? 0);
        }, 0),
    [applications, scholarships]
  );

  const applicationIds = useMemo(() => new Set(applications.map((a) => a.scholarshipId)), [applications]);
  const greenlightEligibleCount = useMemo(() => {
    return matchResults.filter(
      (r) =>
        (r.eligibilityStatus === "eligible" || r.eligibilityStatus === "almost_eligible" || r.eligibilityStatus === "may_not_be_eligible") &&
        r.matchScore >= GREENLIGHT_MIN_SCORE
    ).length;
  }, [matchResults]);
  const topRecommended = useMemo(() => {
    const notStarted = scholarships.filter((s) => !applicationIds.has(s.id));
    const withScores = notStarted
      .map((s) => {
        const r = matchResults.find((m) => m.id === s.id);
        if (!r) return null;
        const ok = r.eligibilityStatus === "eligible" || r.eligibilityStatus === "almost_eligible" || (r.eligibilityStatus === "may_not_be_eligible" && r.matchScore >= 50);
        if (!ok) return null;
        return { scholarship: s, matchScore: r.matchScore, eligibilityStatus: r.eligibilityStatus };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    withScores.sort((a, b) => b.matchScore - a.matchScore || (new Date(a.scholarship.deadline || "").getTime() - new Date(b.scholarship.deadline || "").getTime()));
    return withScores.slice(0, 3);
  }, [scholarships, applicationIds, matchResults]);

  const pipelineCards = useMemo(
    () =>
      applications.map((app) => {
        const scholarship = scholarships.find((s) => s.id === app.scholarshipId);
        return {
          id: app.id,
          title: scholarship?.title ?? "Application",
          amount: scholarship?.amount,
          deadline: scholarship?.deadline,
          status: app.status,
          progress: app.progress,
          nextTask: app.nextTask,
          owlStatus: app.owlStatus
        };
      }),
    [applications, scholarships]
  );

  const statCards = [
    {
      label: "Scholarships you qualify for",
      value: greenlightEligibleCount,
      icon: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: "bg-emerald-500/10"
    },
    {
      label: "In your pipeline",
      value: applications.length,
      icon: (
        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      iconBg: "bg-amber-500/10"
    },
    {
      label: "In progress",
      value: inProgress,
      icon: (
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      iconBg: "bg-blue-500/10"
    },
    {
      label: "Due soon (7 days)",
      value: dueSoon,
      icon: (
        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: "bg-red-500/10"
    },
    {
      label: "Estimated $ applied",
      value: `$${estimatedSum.toLocaleString()}`,
      icon: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: "bg-emerald-500/10"
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={dueSoon === 0 ? "No deadlines this week. Browse scholarships to get started." : `You have ${dueSoon} deadline${dueSoon === 1 ? "" : "s"} this week.`}
        primaryAction={
          <Link
            href="/app/scholarships"
            className="btn-gold text-sm py-2 px-5"
          >
            Start application
          </Link>
        }
      />

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${stat.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-xs text-[var(--muted-2)]">{stat.label}</p>
                <p className="mt-0.5 text-2xl font-bold font-heading">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {topRecommended.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[var(--muted)]">
            Top recommended for you
          </h2>
          <p className="text-xs text-[var(--muted-2)]">
            {greenlightEligibleCount} scholarship{greenlightEligibleCount === 1 ? "" : "s"} you qualify for. Start with these:
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {topRecommended.map(({ scholarship, matchScore }) => (
              <Card key={scholarship.id} className="p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-[var(--text)] line-clamp-2">
                    {decodeHtmlEntities(scholarship.title)}
                  </h3>
                  <span className="shrink-0 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-2 py-0.5">
                    {matchScore}% match
                  </span>
                </div>
                {scholarship.deadline && (
                  <p className="mt-1 text-xs text-[var(--muted-2)]">
                    Due {new Date(scholarship.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
                {scholarship.amount != null && scholarship.amount > 0 && (
                  <p className="mt-0.5 text-xs text-[var(--muted-2)]">
                    Award: ${scholarship.amount.toLocaleString()}
                  </p>
                )}
                <Button
                  className="mt-3 w-full btn-gold text-sm py-2"
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
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
            <p className="text-sm font-medium text-[var(--text)]">No applications yet</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Browse scholarships and start an application to see it here.
            </p>
            <Link
              href="/app/scholarships"
              className="btn-gold mt-4 inline-flex text-sm py-2 px-5"
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
