"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Tabs } from "@/components/ui/Tabs";
import { PipelineBoard } from "@/components/feature/PipelineBoard";
import { applications, scholarships } from "@/data/mockData";

export default function ApplicationsPage() {
  const [view, setView] = useState<"board" | "list">("board");

  const cards = applications.map((app) => {
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
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        subtitle="See every application in your pipeline."
        primaryAction={
          <Link
            href="/app/scholarships"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-hover)]"
          >
            New application
          </Link>
        }
      />

      <div className="flex items-center justify-between gap-3">
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
      </div>

      {view === "board" ? (
        <PipelineBoard applications={cards} />
      ) : (
        <div className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-xs">
          {applications.map((app) => {
            const scholarship = scholarships.find(
              (s) => s.id === app.scholarshipId
            );
            return (
              <Link
                key={app.id}
                href={`/app/applications/${app.id}`}
                className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-[var(--surface-2)]"
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

