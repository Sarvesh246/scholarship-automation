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
import { LoadingScreenBlock } from "@/components/ui/LoadingScreen";
import { useToast } from "@/components/ui/Toast";
import { ensureApplication, getApplication } from "@/lib/applicationStorage";
import { getScholarship } from "@/lib/scholarshipStorage";
import { getEssays } from "@/lib/essayStorage";
import { matchEssaysToScholarship } from "@/lib/essayMatching";
import { getProfile } from "@/lib/profileStorage";
import { getProfileFieldValues, checkEligibility } from "@/lib/eligibility";
import { buildUserSignals, computeMatch } from "@/lib/matchEngine";
import { useUser } from "@/hooks/useUser";
import { getIdToken } from "@/hooks/useAdmin";
import { formatScholarshipDescription } from "@/lib/formatScholarshipDescription";
import { formatCategoryDisplay, decodeHtmlEntities, displayScholarshipTitle } from "@/lib/utils";
import { getApplyUrl } from "@/lib/applyUrl";
import { QualityScoreBadge } from "@/components/ui/QualityScoreBadge";
import type { Scholarship } from "@/types";
import type { Profile } from "@/types";
import type { ScholarshipMatchResult } from "@/types";

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
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState("bad_scholarship");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [suggestedEssays, setSuggestedEssays] = useState<{ id: string; title: string; wordCount: number }[]>([]);
  const { showToast } = useToast();
  const router = useRouter();
  const { user } = useUser();

  const loadScholarship = useCallback(async () => {
    const s = await getScholarship(id);
    setScholarship(s);
    if (s) {
      const [existing, profileData, essaysList] = await Promise.all([
        getApplication(id),
        getProfile(),
        (s.prompts ?? []).length > 0 ? getEssays() : Promise.resolve([])
      ]);
      setHasApplication(!!existing);
      setApplication(existing ?? null);
      setProfile(profileData ?? null);
      if ((s.prompts ?? []).length > 0 && essaysList.length > 0) {
        setSuggestedEssays(matchEssaysToScholarship(essaysList, s).map((e) => ({ id: e.id, title: e.title, wordCount: e.wordCount })));
      } else {
        setSuggestedEssays([]);
      }
      if (existing?.promptResponses?.length) {
        const next: Record<string, string> = {};
        existing.promptResponses.forEach((r, i) => {
          next[i] = r.response ?? "";
        });
        setResponses(next);
      }
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
        message: `${displayScholarshipTitle(scholarship.title)} has been added to your pipeline.`,
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

  const handleFeedback = async () => {
    const msg = feedbackMessage.trim();
    if (msg.length < 10) {
      showToast({ title: "Please enter at least 10 characters", variant: "danger" });
      return;
    }
    const token = await getIdToken();
    if (!token) {
      showToast({ title: "Sign in to submit feedback", variant: "danger" });
      return;
    }
    setFeedbackSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: feedbackType,
          message: msg,
          scholarshipId: scholarship!.id,
        }),
      });
      if (res.ok) {
        showToast({ title: "Feedback submitted", message: "Thank you for helping improve our database.", variant: "success" });
        setFeedbackMessage("");
        setFeedbackOpen(false);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast({ title: "Could not submit", message: data.error, variant: "danger" });
      }
    } catch {
      showToast({ title: "Could not submit feedback", variant: "danger" });
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const isOwl = scholarship?.source === "scholarship_owl";
  const isExpired = !!scholarship?.expiredAt;
  const applyUrl = getApplyUrl(scholarship);
  const profileValues = profile
    ? getProfileFieldValues(profile, user)
    : {};
  const eligibility = scholarship ? checkEligibility(scholarship, profileValues) : null;
  const canApplyOwl = isOwl && !isExpired && (eligibility?.eligible ?? true);

  const matchResult: ScholarshipMatchResult | null = scholarship && profile
    ? computeMatch(scholarship, buildUserSignals(profile))
    : null;
  const hasEligibilityTags = (scholarship?.eligibilityTags ?? []).length > 0;

  if (loading) {
    return <LoadingScreenBlock message="Loading scholarship…" />;
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
        title={displayScholarshipTitle(scholarship.title)}
        subtitle={decodeHtmlEntities(scholarship.sponsor)}
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
              title={!user && !hasApplication ? "Waiting for sign-in…" : undefined}
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
            {scholarship.verificationStatus === "approved" && (
              <span title="Screened by our quality checks">
                <Badge variant="success">Verified</Badge>
              </span>
            )}
            {(scholarship.qualityScore ?? 0) > 0 && (
              <QualityScoreBadge scholarship={scholarship} />
            )}
            {scholarship.lastVerifiedAt && (
              <span className="text-[var(--muted-2)]">
                Last verified:{" "}
                {typeof scholarship.lastVerifiedAt === "string"
                  ? new Date(scholarship.lastVerifiedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                  : scholarship.lastVerifiedAt && typeof scholarship.lastVerifiedAt === "object" && "_seconds" in scholarship.lastVerifiedAt
                    ? new Date((scholarship.lastVerifiedAt as { _seconds: number })._seconds * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                    : "—"}
              </span>
            )}
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
              Amount: {(scholarship.amount ?? 0) > 0 ? `$${scholarship.amount.toLocaleString()}` : "Varies"}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            {(scholarship.categoryTags ?? []).map((tag) => (
              <Tag key={tag}>{formatCategoryDisplay(tag)}</Tag>
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
                {formatScholarshipDescription(scholarship.description)}
              </div>
            </div>
          )}

          {tab === "requirements" && (
            <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
              <h3 className="text-sm font-semibold font-heading">Eligibility</h3>
              {hasEligibilityTags ? (
                <>
                  <p className="text-xs text-[var(--muted-2)]">Requirements for this scholarship:</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-[var(--text)] leading-relaxed">
                    {(scholarship.eligibilityTags ?? []).map((tag) => (
                      <li key={tag}>{decodeHtmlEntities(tag)}</li>
                    ))}
                  </ul>
                  {matchResult != null && matchResult.matchScore > 0 && (
                    <div className="mt-4 pt-4 border-t border-[var(--border)]">
                      <p className="text-xs font-medium text-[var(--muted)] mb-1">
                        Your fit: {matchResult.matchScore}%
                      </p>
                      {matchResult.reasons.length > 0 && (
                        <p className="text-xs text-emerald-400/90">
                          {matchResult.reasons.join(" · ")}
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : matchResult != null && matchResult.matchScore > 0 ? (
                <>
                  <p className="text-xs text-[var(--muted-2)]">No specific eligibility criteria listed. Based on your profile, here’s why you’re a good fit:</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold px-2.5 py-1">
                      {matchResult.matchScore}% match
                    </span>
                  </div>
                  {matchResult.reasons.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-[var(--text)]">
                      {matchResult.reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-emerald-500 dark:text-emerald-400 shrink-0">✓</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {matchResult.almostEligibleReason && (
                    <p className="mt-2 text-xs text-amber-500/90">{matchResult.almostEligibleReason}</p>
                  )}
                </>
              ) : (
                <p className="text-xs text-[var(--muted)]">
                  No specific eligibility requirements listed for this scholarship.
                  {!profile && " Add your profile to see how you match."}
                </p>
              )}
            </div>
          )}

          {tab === "prompts" && (scholarship.prompts ?? []).length > 0 && (
            <div className="space-y-3">
              {suggestedEssays.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-xs font-medium text-amber-400 mb-2">Suggested essays</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedEssays.map((e) => (
                      <Link
                        key={e.id}
                        href={`/app/essays/${e.id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-400 hover:bg-amber-500/20"
                      >
                        {e.title}
                        <span className="text-[var(--muted-2)]">({e.wordCount}w)</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
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
          <h3 className="text-sm font-semibold font-heading">Apply</h3>
          {applyUrl ? (
            <a
              href={applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 transition-colors w-full justify-center"
            >
              <span>Apply on official site</span>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ) : (
            <p className="text-xs text-[var(--muted)]">
              Application link not available for this listing. Use &quot;Report a problem&quot; below if you have the correct link.
            </p>
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
              <dd>{(scholarship.categoryTags ?? []).map(formatCategoryDisplay).join(", ")}</dd>
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

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <button
          type="button"
          onClick={() => setFeedbackOpen(!feedbackOpen)}
          className="text-sm font-medium text-[var(--muted)] hover:text-amber-400 transition-colors"
        >
          {feedbackOpen ? "−" : "+"} Report a problem or duplicate
        </button>
        {feedbackOpen && (
          <div className="mt-3 space-y-3">
            <select
              value={feedbackType}
              onChange={(e) => setFeedbackType(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            >
              <option value="bad_scholarship">Bad or incorrect info</option>
              <option value="duplicate">Duplicate scholarship</option>
              <option value="expired">Already expired</option>
              <option value="general">Other</option>
            </select>
            <textarea
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder="Describe the issue (at least 10 characters)..."
              rows={3}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm placeholder:text-[var(--muted-2)]"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleFeedback}
              disabled={feedbackSubmitting || feedbackMessage.trim().length < 10}
            >
              {feedbackSubmitting ? "Sending…" : "Submit feedback"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
