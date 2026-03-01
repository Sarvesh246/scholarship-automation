"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { scholarships } from "@/data/mockData";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { TabList, Tab } from "@/components/ui/Tabs";
import { PromptBlock } from "@/components/feature/PromptBlock";
import { Checklist } from "@/components/feature/Checklist";
import { useToast } from "@/components/ui/Toast";
import { ensureApplication } from "@/lib/applicationStorage";

export default function ScholarshipDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const scholarship = scholarships.find((s) => s.id === id);
  const [tab, setTab] = useState<"overview" | "requirements" | "prompts" | "checklist">("overview");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const { showToast } = useToast();
  const router = useRouter();

  if (!scholarship) {
    return (
      <div className="space-y-4">
        <PageHeader title="Scholarship not found" />
        <p className="text-sm text-[var(--muted)]">
          We couldn&apos;t find this scholarship in your workspace.
        </p>
      </div>
    );
  }

  const handleStart = () => {
    ensureApplication(scholarship.id);
    router.push(`/app/applications/app-${scholarship.id}`);
    showToast({
      title: "Application started",
      message: `${scholarship.title} has been added to your pipeline.`,
      variant: "success"
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={scholarship.title}
        subtitle={scholarship.sponsor}
        primaryAction={
          <Button type="button" onClick={handleStart}>
            Start application
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
