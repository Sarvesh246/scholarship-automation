"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { DeadlineList } from "@/components/feature/DeadlineList";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getApplications, ensureApplication } from "@/lib/applicationStorage";
import { getScholarships } from "@/lib/scholarshipStorage";
import { getProfile } from "@/lib/profileStorage";
import { computeMatchesForUser, getCachedMatches, GREENLIGHT_MIN_SCORE } from "@/lib/matchEngine";
import { useUser } from "@/hooks/useUser";
import { decodeHtmlEntities } from "@/lib/utils";
import type { Application, Scholarship } from "@/types";

export default function DeadlinesPage() {
  const router = useRouter();
  const { user } = useUser();
  const [applications, setApplications] = useState<Application[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [matchResults, setMatchResults] = useState<{ id: string; matchScore: number; eligibilityStatus: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [apps, schols] = await Promise.all([getApplications(), getScholarships()]);
    setApplications(apps);
    setScholarships(schols);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const onFocus = () => loadData();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadData]);

  useEffect(() => {
    if (!user?.uid || scholarships.length === 0) return;
    const run = async () => {
      const profile = await getProfile();
      const cached = getCachedMatches(user.uid);
      if (cached && cached.length === scholarships.length) {
        setMatchResults(cached.map((r) => ({ id: r.scholarshipId, matchScore: r.matchScore, eligibilityStatus: r.eligibilityStatus })));
        return;
      }
      const results = await computeMatchesForUser(user.uid, profile, scholarships);
      setMatchResults(results.map((r) => ({ id: r.scholarshipId, matchScore: r.matchScore, eligibilityStatus: r.eligibilityStatus })));
    };
    run();
  }, [user?.uid, scholarships]);

  const applicationIds = useMemo(() => new Set(applications.map((a) => a.scholarshipId)), [applications]);
  const matchMap = useMemo(() => {
    const m = new Map<string, { matchScore: number; eligibilityStatus: string }>();
    matchResults.forEach((r) => m.set(r.id, { matchScore: r.matchScore, eligibilityStatus: r.eligibilityStatus }));
    return m;
  }, [matchResults]);

  const now = new Date();
  const tenDays = new Date(now);
  tenDays.setDate(now.getDate() + 10);
  const oneWeek = new Date(now);
  oneWeek.setDate(now.getDate() + 7);
  const twoWeeks = new Date(now);
  twoWeeks.setDate(now.getDate() + 14);

  const recommendedDueSoon = useMemo(() => {
    return scholarships
      .filter((s) => {
        if (applicationIds.has(s.id)) return false;
        const deadline = s.deadline ? new Date(s.deadline.replace(/T.*$/, "")) : null;
        if (!deadline || deadline < now || deadline > tenDays) return false;
        const m = matchMap.get(s.id);
        if (!m) return false;
        return (m.eligibilityStatus === "eligible" || m.eligibilityStatus === "almost_eligible") && m.matchScore >= GREENLIGHT_MIN_SCORE;
      })
      .map((s) => ({ scholarship: s, matchScore: matchMap.get(s.id)!.matchScore }))
      .sort((a, b) => new Date(a.scholarship.deadline!).getTime() - new Date(b.scholarship.deadline!).getTime())
      .slice(0, 5);
  }, [scholarships, applicationIds, matchMap]);

  const deadlines = applications
    .map((app) => {
      const s = scholarships.find((sch) => sch.id === app.scholarshipId);
      if (!s?.deadline) return null;
      const deadlineStatus =
        app.status === "submitted"
          ? ("submitted" as const)
          : app.status === "drafting" || app.status === "reviewing"
            ? ("in_progress" as const)
            : ("not_started" as const);
      return {
        id: app.id,
        title: s.title,
        scholarshipId: app.scholarshipId,
        deadline: s.deadline,
        status: deadlineStatus
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null);

  const thisWeek = deadlines.filter((d) => {
    const date = new Date(d.deadline);
    return date >= now && date <= oneWeek;
  });
  const nextWeek = deadlines.filter((d) => {
    const date = new Date(d.deadline);
    return date > oneWeek && date <= twoWeeks;
  });
  const later = deadlines.filter((d) => {
    const date = new Date(d.deadline);
    return date > twoWeeks;
  });

  const hasAnyDeadlines = deadlines.length > 0;
  const hasRecommended = recommendedDueSoon.length > 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deadlines"
        subtitle={hasRecommended ? `Start ${recommendedDueSoon.length} scholarship${recommendedDueSoon.length === 1 ? "" : "s"} due within 10 days.` : "See what's due this week and beyond."}
      />
      {hasRecommended && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-[var(--muted)]">
            Recommended for you — due within 10 days
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommendedDueSoon.map(({ scholarship, matchScore }) => (
              <Card key={scholarship.id} className="p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/app/scholarships/${scholarship.id}`} className="font-medium text-[var(--text)] hover:text-amber-400 line-clamp-2">
                    {decodeHtmlEntities(scholarship.title)}
                  </Link>
                  <span className="shrink-0 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-2 py-0.5">
                    {matchScore}% match
                  </span>
                </div>
                {scholarship.deadline && (
                  <p className="mt-1 text-xs text-[var(--muted-2)]">
                    Due {new Date(scholarship.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
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
      {!hasAnyDeadlines ? (
        <EmptyState
          title="No deadlines yet"
          description="Start an application from the Scholarships page to see due dates here."
          actionLabel="Browse scholarships"
          onAction={() => router.push("/app/scholarships")}
        />
      ) : (
        <DeadlineList
          groups={[
            { label: "This week", items: thisWeek },
            { label: "Next week", items: nextWeek },
            { label: "Later", items: later }
          ]}
          onResume={(applicationId) => router.push(`/app/applications/${applicationId}`)}
        />
      )}
    </div>
  );
}
