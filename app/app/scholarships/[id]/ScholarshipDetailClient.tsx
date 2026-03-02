"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { TabList, Tab } from "@/components/ui/Tabs";
import { PromptBlock } from "@/components/feature/PromptBlock";
import { Checklist } from "@/components/feature/Checklist";
import { ApplyToOwlModal } from "@/components/feature/ApplyToOwlModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ensureApplication, getApplication } from "@/lib/applicationStorage";
import { getScholarship } from "@/lib/scholarshipStorage";
import { getProfile } from "@/lib/profileStorage";
import { getProfileFieldValues, checkEligibility } from "@/lib/eligibility";
import { useUser } from "@/hooks/useUser";
import type { Scholarship } from "@/types";
import type { Profile } from "@/types";

export default function ScholarshipDetailClient() {
  const params = useParams();
  const id = params?.id as string;
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [application, setApplication] = useState<{ docsUploaded?: string[]; docsRequired?: string[]; promptResponses?: { prompt: string; response: string }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasApplication, setHasApplication] = useState<boolean | null>(null);
  const [owlApplyOpen, setOwlApplyOpen] = useState(false);
  const [tab, setTab] = useState<"overview" | "requirements" | "prompts" | "checklist">("overview");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const { showToast } = useToast();
  const router = useRouter();
  const { user } = useUser();

  const loadScholarship = useCallback(async () => {
    const s = await getScholarship(id);
    setScholarship(s);
    if (s) {
      const [existing, profileData] = await Promise.all([
        getApplication(id),
        s.source === "scholarship_owl" ? getProfile() : Promise.resolve(null)
      ]);
      setHasApplication(!!existing);
      setApplication(existing ?? null);
      setProfile(profileData ?? null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadScholarship();
  }, [loadScholarship]);

  useEffect(() => {
    const onFocus = () => { loadScholarship(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
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

  const isOwl = scholarship?.source === "scholarship_owl";
  const isExpired = !!scholarship?.expiredAt;
  const profileValues = profile
    ? getProfileFieldValues(profile, user)
    : {};
  const eligibility = scholarship ? checkEligibility(scholarship, profileValues) : null;
  const canApplyOwl = isOwl && !isExpired && (eligibility?.eligible ?? true);

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
        <Link
          href="/app/scholarships"
          className="inline-flex items-center gap-2 text-sm font-medium text-amber-400 hover:text-amber-300"
        >
          Browse scholarships
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={scholarship.title}
        subtitle={scholarship.sponsor}
        primaryAction={
          <div className="flex flex-wrap items-center gap-2">
            {isOwl && canApplyOwl && (
              <Button
                type="button"
                variant="primary"
                onClick={() => setOwlApplyOpen(true)}
              >
                Apply with ScholarshipOwl
              </Button>
            )}
            <Button
              type="button"
              onClick={hasApplication ? handleContinue : handleStart}
              disabled={(!user && !hasApplication) || isExpired}
              variant={isOwl && canApplyOwl ? "secondary" : "primary"}
            >
              {!user && !hasApplication
                ? "Loading…"
                : hasApplication
                  ? "Continue"
                  : isExpired
                    ? "Expired"
                    : "Start application"}
            </Button>
          </div>
        }
      />

      {eligibility && !eligibility.eligible && eligibility.message && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {eligibility.message}
        </div>
      )}
      {eligibility?.eligible && eligibility.message && (
        <p className="text-xs text-[var(--muted)]">{eligibility.message}</p>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {isExpired && <Badge variant="danger">Expired</Badge>}
            {scholarship.recurring && !isExpired && (
              <Badge variant="info">
                Recurring
                {scholarship.nextStart
                  ? ` · Next: ${new Date(scholarship.nextStart).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}`
                  : ""}
              </Badge>
            )}
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
            {(scholarship.categoryTags ?? []).map((tag) => (
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
            {(scholarship.prompts ?? []).length > 0 && (
              <Tab value="prompts" current={tab} onChange={() => setTab("prompts")}>
                Prompts
              </Tab>
            )}
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
              <div className="text-[var(--text)] whitespace-pre-line leading-relaxed">
                {scholarship.description}
              </div>
            </div>
          )}

          {tab === "requirements" && (
            <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
              <h3 className="text-sm font-semibold font-heading">Eligibility</h3>
              {(scholarship.eligibilityTags ?? []).length > 0 ? (
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-[var(--muted)]">
                  {(scholarship.eligibilityTags ?? []).map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  No specific eligibility requirements listed for this scholarship.
                </p>
              )}
            </div>
          )}

          {tab === "prompts" && (scholarship.prompts ?? []).length > 0 && (
            <div className="space-y-3">
              {(scholarship.prompts ?? []).map((prompt, index) => (
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
                  completed: hasApplication === true || (scholarship.eligibilityTags ?? []).length === 0
                },
                {
                  id: "docs",
                  label: "List required documents",
                  completed: application
                    ? (application.docsUploaded ?? []).length >= (application.docsRequired ?? ["Transcript", "Resume"]).length
                    : false
                },
                {
                  id: "prompts",
                  label: (scholarship.prompts ?? []).length > 0 ? "Complete essay prompts" : "No essays required",
                  completed: (scholarship.prompts ?? []).length === 0
                    ? true
                    : application
                      ? (application.promptResponses ?? []).length >= (scholarship.prompts ?? []).length
                      : false
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
              <dd>{scholarship.estimatedTime ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Category</dt>
              <dd>{(scholarship.categoryTags ?? []).join(", ")}</dd>
            </div>
            {(scholarship.prompts ?? []).length > 0 && (
            <div className="flex justify-between">
              <dt>Prompts</dt>
              <dd>{(scholarship.prompts ?? []).length}</dd>
            </div>
            )}
          </dl>
        </div>
      </div>

      <ApplyToOwlModal
        open={owlApplyOpen}
        scholarship={scholarship}
        profile={profile}
        onClose={() => setOwlApplyOpen(false)}
        onSuccess={(status) => {
          setHasApplication(true);
          loadScholarship();
          showToast({
            title: "Application submitted",
            message: status ? `Status: ${status}. Your application was sent to ScholarshipOwl.` : "Your application was sent to ScholarshipOwl.",
            variant: "success"
          });
        }}
      />
    </div>
  );
}
