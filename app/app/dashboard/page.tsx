"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PipelineBoard } from "@/components/feature/PipelineBoard";
import { Skeleton } from "@/components/ui/Skeleton";
import { getApplications } from "@/lib/applicationStorage";
import { getScholarships } from "@/lib/scholarshipStorage";
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
  const [applications, setApplications] = useState<Application[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
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
    const onFocus = () => { loadData(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadData]);

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

  const matchedCount = applications.length;

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
          nextTask: app.nextTask
        };
      }),
    [applications, scholarships]
  );

  const statCards = [
    {
      label: "Matched scholarships",
      value: matchedCount,
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
        subtitle={`You have ${dueSoon} deadline${dueSoon === 1 ? "" : "s"} this week.`}
        primaryAction={
          <Link
            href="/app/scholarships"
            className="btn-gold text-sm py-2 px-5"
          >
            Start application
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
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

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--muted)]">
          Applications pipeline
        </h2>
        <PipelineBoard
          applications={pipelineCards}
          getCardHref={(applicationId) => `/app/applications/${applicationId}`}
        />
      </div>

    </div>
  );
}
