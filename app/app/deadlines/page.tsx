"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { DeadlineList } from "@/components/feature/DeadlineList";
import { Skeleton } from "@/components/ui/Skeleton";
import { getApplications } from "@/lib/applicationStorage";
import { getScholarships } from "@/lib/scholarshipStorage";
import type { Application, Scholarship } from "@/types";

export default function DeadlinesPage() {
  const router = useRouter();
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
    const onFocus = () => loadData();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadData]);

  const now = new Date();
  const oneWeek = new Date(now);
  oneWeek.setDate(now.getDate() + 7);
  const twoWeeks = new Date(now);
  twoWeeks.setDate(now.getDate() + 14);

  // Only show deadlines for scholarships the user has started (has an application)
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
        subtitle="See what's due this week and beyond."
      />
      <DeadlineList
        groups={[
          { label: "This week", items: thisWeek },
          { label: "Next week", items: nextWeek },
          { label: "Later", items: later }
        ]}
        onResume={(scholarshipId) => router.push(`/app/applications/${scholarshipId}`)}
      />
    </div>
  );
}
