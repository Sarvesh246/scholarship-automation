"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Tabs } from "@/components/ui/Tabs";
import { PipelineBoard } from "@/components/feature/PipelineBoard";
import { Skeleton } from "@/components/ui/Skeleton";
import { getApplications } from "@/lib/applicationStorage";
import { getScholarships } from "@/lib/scholarshipStorage";
import type { Application, Scholarship } from "@/types";

export default function ApplicationsPage() {
  const [view, setView] = useState<"board" | "list">("board");
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

  const cards = useMemo(
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        subtitle="See every application in your pipeline."
        primaryAction={
          <Link
            href="/app/scholarships"
            className="btn-gold text-sm py-2 px-5"
          >
            New application
          </Link>
        }
      />

      <div className="flex items-center justify-between gap-3">
        {applications.length > 0 && (
          <>
            <p className="text-xs text-[var(--muted)]">
              {applications.length} total applications.
            </p>
            <Tabs
              value={view}
              onChange={(v) => setView(v as "board" | "list")}
              tabs={[
                { value: "board", label: "Board" },
                { value: "list", label: "List" }
              ]}
            />
          </>
        )}
      </div>

      {applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <p className="text-sm font-medium text-[var(--text)]">No applications yet</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Start an application from the Scholarships page to see it here.
          </p>
          <Link
            href="/app/scholarships"
            className="btn-gold mt-4 inline-flex text-sm py-2 px-5"
          >
            Browse scholarships
          </Link>
        </div>
      ) : view === "board" ? (
        <PipelineBoard
          applications={cards}
          getCardHref={(id) => `/app/applications/${id}`}
        />
      ) : (
        <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs">
          {applications.map((app) => {
            const scholarship = scholarships.find(
              (s) => s.id === app.scholarshipId
            );
            return (
              <Link
                key={app.id}
                href={`/app/applications/${app.id}`}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-[var(--surface-2)] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">
                    {scholarship?.title ?? "Application"}
                  </p>
                  <p className="text-[10px] text-[var(--muted-2)]">
                    {scholarship?.sponsor}
                  </p>
                </div>
                <div className="w-28">
                  <ProgressBar value={app.progress} />
                </div>
                <Badge variant="info" className="text-[10px]">
                  {app.status === "not_started"
                    ? "Not started"
                    : app.status === "drafting"
                    ? "Drafting"
                    : app.status === "reviewing"
                    ? "Reviewing"
                    : "Submitted"}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
