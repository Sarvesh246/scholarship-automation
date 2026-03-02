"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { TabList, Tab } from "@/components/ui/Tabs";
import { PromptBlock } from "@/components/feature/PromptBlock";
import { Checklist } from "@/components/feature/Checklist";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ensureApplication, getApplication } from "@/lib/applicationStorage";
import { getScholarship } from "@/lib/scholarshipStorage";
import { useUser } from "@/hooks/useUser";
import type { Scholarship } from "@/types";

export default function ScholarshipDetailClient() {
  const params = useParams();
  const id = params?.id as string;
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasApplication, setHasApplication] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"overview" | "requirements" | "prompts" | "checklist">("overview");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const { showToast } = useToast();
  const router = useRouter();
  const { user } = useUser();

  const loadScholarship = useCallback(async () => {
    const s = await getScholarship(id);
    setScholarship(s);
    if (s) {
      const existing = await getApplication(id);
      setHasApplication(!!existing);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadScholarship();
  }, [loadScholarship]);

  const handleStart = async () => {
    if (!scholarship) return;
    if (!user) {
      showToast({
        title: "Please wait",
        message: "Your session is loading. Try again in a moment.",
        variant: "danger"
      });
      return;
    }
    try {
      await ensureApplication(scholarship.id);
      setHasApplication(true);
      router.push(`/app/applications/${scholarship.id}`);
      showToast({
        title: "Application started",
        message: `${scholarship.title} has been added to your pipeline.`,
        variant: "success"
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      showToast({
        title: "Could not start application",
        message,
        variant: "danger"
      });
    }
  };

  const handleContinue = () => {
    router.push(`/app/applications/${scholarship!.id}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!scholarship) {
    return (
      <div className="space-y-4">
        <PageHeader title="Scholarship not found" />
        <p className="text-sm text-[var(--muted)]">
          We couldn&apos;t find this scholarship in the database.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={scholarship.title}
        subtitle={scholarship.sponsor}
        primaryAction={
          <Button
            type="button"
            onClick={hasApplication ? handleContinue : handleStart}
            disabled={!user && !hasApplication}
          >
            {!user && !hasApplication
              ? "Loading…"
              : hasApplication
                ? "Continue"
                : "Start application"}
          </Button>
        }
      />

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="info">
              Deadline:{" "}
              {new Date(scholarship.deadline).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric"
              })}
            </Badge>
            <Badge variant="success">
              Amount: ${scholarship.amount.toLocaleString()}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            {scholarship.categoryTags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>

          <TabList>
            <Tab value="overview" current={tab} onChange={() => setTab("overview")}>
              Overview
            </Tab>
            <Tab
              value="requirements"
              current={tab}
              onChange={() => setTab("requirements")}
            >
              Requirements
            </Tab>
            <Tab value="prompts" current={tab} onChange={() => setTab("prompts")}>
              Prompts
            </Tab>
            <Tab
              value="checklist"
              current={tab}
              onChange={() => setTab("checklist")}
            >
              Checklist
            </Tab>
          </TabList>

          {tab === "overview" && (
            <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
              <p className="text-[var(--text)]">{scholarship.description}</p>
            </div>
          )}

          {tab === "requirements" && (
            <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
              <h3 className="text-sm font-semibold font-heading">Eligibility</h3>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-[var(--muted)]">
                {scholarship.eligibilityTags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </div>
          )}

          {tab === "prompts" && (
            <div className="space-y-3">
              {scholarship.prompts.map((prompt, index) => (
                <PromptBlock
                  key={index}
                  prompt={prompt}
                  value={responses[index] ?? ""}
                  onChange={(value) =>
                    setResponses((prev) => ({ ...prev, [index]: value }))
                  }
                />
              ))}
            </div>
          )}

          {tab === "checklist" && (
            <Checklist
              title="Application checklist"
              items={[
                {
                  id: "review",
                  label: "Review eligibility requirements",
                  completed: false
                },
                {
                  id: "docs",
                  label: "List required documents",
                  completed: false
                },
                {
                  id: "prompts",
                  label: "Skim essay prompts and word counts",
                  completed: false
                }
              ]}
            />
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
          <h3 className="text-sm font-semibold font-heading">At a glance</h3>
          <dl className="mt-2 space-y-2 text-xs text-[var(--muted)]">
            <div className="flex justify-between">
              <dt>Estimated time</dt>
              <dd>{scholarship.estimatedTime}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Category</dt>
              <dd>{scholarship.categoryTags.join(", ")}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Prompts</dt>
              <dd>{scholarship.prompts.length}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
