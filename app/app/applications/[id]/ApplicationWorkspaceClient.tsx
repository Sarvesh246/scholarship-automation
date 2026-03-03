"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getApplication, saveApplication, deleteApplication, updateApplicationStatus, updateApplicationPromptResponses, updateApplicationDocs, updateApplicationLastViewed, updateApplicationOutcome } from "@/lib/applicationStorage";
import { getScholarship } from "@/lib/scholarshipStorage";
import { getEssays } from "@/lib/essayStorage";
import { matchEssaysToPrompt } from "@/lib/essayMatching";
import { getApplicationBreakdown } from "@/lib/applicationBreakdown";
import { getApplyUrl } from "@/lib/applyUrl";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Checklist } from "@/components/feature/Checklist";
import { DocumentSlot } from "@/components/feature/DocumentSlot";
import { PromptBlock } from "@/components/feature/PromptBlock";
import { Modal } from "@/components/ui/Modal";
import { LoadingScreenBlock } from "@/components/ui/LoadingScreen";
import { useToast } from "@/components/ui/Toast";
import type { Application, Scholarship, Essay } from "@/types";
import { decodeHtmlEntities, displayScholarshipTitle } from "@/lib/utils";
import { formatScholarshipDescription } from "@/lib/formatScholarshipDescription";

type StepKey = "overview" | "eligibility" | "documents" | "prompts" | "final";

export default function ApplicationWorkspaceClient() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { showToast } = useToast();
  const [application, setApplication] = useState<Application | null>(null);
  const [scholarship, setScholarship] = useState<Scholarship | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<StepKey>("overview");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [essays, setEssays] = useState<Essay[]>([]);

  const loadData = useCallback(async () => {
    const [app, userEssays] = await Promise.all([
      getApplication(id),
      getEssays(),
    ]);
    setApplication(app);
    setEssays(userEssays);
    if (app) {
      const schol = await getScholarship(app.scholarshipId);
      setScholarship(schol);
      updateApplicationLastViewed(id);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!application) return;
    setSaving(true);
    try {
      await saveApplication(application);
      showToast({ title: "Saved", message: "Your progress has been saved.", variant: "success" });
    } catch {
      showToast({ title: "Save failed", message: "Please try again.", variant: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDeleteOpen(false);
    try {
      await deleteApplication(id);
      showToast({ title: "Application removed", variant: "success" });
      router.push("/app/applications");
    } catch {
      showToast({ title: "Could not remove application", message: "Please try again.", variant: "danger" });
    }
  };

  const handleMarkSubmitted = async () => {
    await updateApplicationStatus(id, "submitted", 100);
    const updated = await getApplication(id);
    setApplication(updated);
    setConfirmOpen(false);
    showToast({
      title: "Marked as submitted",
      message: "Track this as submitted in your pipeline.",
      variant: "success"
    });
  };

  const applyUrl = getApplyUrl(scholarship);

  const handleSetOutcome = async (outcome: "awaiting" | "won" | "rejected") => {
    await updateApplicationOutcome(id, outcome);
    const updated = await getApplication(id);
    setApplication(updated);
    showToast({ title: "Result updated", variant: "success" });
  };

  if (loading) {
    return <LoadingScreenBlock message="Loading application…" />;
  }

  if (!application || !scholarship) {
    return (
      <div className="space-y-4">
        <PageHeader title="Application not found" />
        <p className="text-sm text-[var(--muted)]">
          This application doesn&apos;t exist yet. Start one from the scholarships page.
        </p>
      </div>
    );
  }

  const prompts = scholarship.prompts ?? [];
  const steps: { key: StepKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "eligibility", label: "Eligibility" },
    { key: "documents", label: "Documents" },
    ...(prompts.length > 0 ? [{ key: "prompts" as StepKey, label: "Prompts" }] : []),
    { key: "final", label: "Final review" }
  ];

  const breakdown = getApplicationBreakdown(scholarship, application);

  return (
    <div className="space-y-6">
      <PageHeader
        title={displayScholarshipTitle(scholarship.title)}
        subtitle="Application workspace"
        primaryAction={
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Back
            </Button>
            <Button type="button" variant="secondary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConfirmDeleteOpen(true)} className="text-red-400 hover:text-red-300 hover:border-red-500/30">
              Delete
            </Button>
          </div>
        }
      />

      {/* Application execution breakdown: completion %, checklist, key facts */}
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium text-[var(--muted-2)] uppercase tracking-wide">Application progress</p>
            <p className="mt-0.5 text-2xl font-bold font-heading text-amber-400">
              You are {breakdown.completionPct}% complete
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Auto-filled from profile where possible · Complete the checklist below to submit.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              <p className="text-[var(--muted-2)]">Deadline</p>
              <p className="font-semibold text-[var(--text)]">{breakdown.deadlineFormatted}</p>
            </div>
            <div className="text-right text-xs">
              <p className="text-[var(--muted-2)]">Effort</p>
              <p className="font-semibold text-[var(--text)]">{breakdown.effortLabel} · {breakdown.effortTier === "easy" ? "Easy" : breakdown.effortTier === "medium" ? "Medium" : "Heavy"}</p>
            </div>
            {breakdown.awardAmount > 0 && (
              <div className="text-right text-xs">
                <p className="text-[var(--muted-2)]">Award</p>
                <p className="font-semibold text-emerald-500 dark:text-emerald-400">${breakdown.awardAmount.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-amber-500/20">
          <Checklist items={breakdown.checklistTasks} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)_minmax(0,0.9fr)]">
        <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs">
          <p className="text-[10px] font-medium text-[var(--muted-2)]">
            Steps
          </p>
          <ol className="mt-1 space-y-1.5">
            {steps.map((s, index) => (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => setStep(s.key)}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors ${
                    step === s.key
                      ? "bg-amber-500/10 text-amber-400"
                      : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--muted-2)]">
                      {index + 1}
                    </span>
                    <span>{s.label}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
          {step === "overview" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold font-heading">Overview</h3>
              {scholarship.description && (
                <div className="text-xs text-[var(--text)] leading-relaxed whitespace-pre-line">
                  {formatScholarshipDescription(decodeHtmlEntities(scholarship.description))}
                </div>
              )}
              <p className="text-xs text-[var(--muted)]">
                Use this workspace to move from idea to submitted application
                without losing track of documents or drafts.
              </p>
            </div>
          )}
          {step === "eligibility" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold font-heading">Eligibility</h3>
              {(scholarship.eligibilityTags ?? []).length > 0 ? (
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-[var(--muted)]">
                  {(scholarship.eligibilityTags ?? []).map((tag) => (
                    <li key={tag}>{decodeHtmlEntities(tag)}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  No specific eligibility requirements listed for this scholarship.
                </p>
              )}
            </div>
          )}
          {step === "documents" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold font-heading">Documents</h3>
              <div className="space-y-2">
                {(application.docsRequired ?? []).map((doc) => (
                  <DocumentSlot
                    key={doc}
                    label={doc}
                    uploaded={(application.docsUploaded ?? []).includes(doc)}
                    onUpload={async () => {
                      const next = [...(application.docsUploaded ?? [])];
                      if (!next.includes(doc)) next.push(doc);
                      await updateApplicationDocs(id, next);
                      const updated = await getApplication(id);
                      if (updated) setApplication(updated);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          {step === "prompts" && prompts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold font-heading">Prompts</h3>
              {prompts.map((prompt, index) => (
                <PromptBlock
                  key={index}
                  prompt={prompt}
                  value={(application.promptResponses ?? [])[index]?.response ?? ""}
                  suggestedEssays={matchEssaysToPrompt(essays, prompt, scholarship)}
                  onChange={async (value) => {
                    const next = [...(application.promptResponses ?? [])];
                    while (next.length <= index) next.push({ prompt: prompts[next.length] ?? "", response: "" });
                    next[index] = { prompt, response: value };
                    await updateApplicationPromptResponses(id, next, {
                      docsRequired: (application.docsRequired ?? []).length,
                      docsUploaded: (application.docsUploaded ?? []).length,
                      promptsTotal: prompts.length,
                    });
                    const updated = await getApplication(id);
                    if (updated) setApplication(updated);
                  }}
                />
              ))}
            </div>
          )}
          {step === "final" && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold font-heading">Final review</h3>
              <Checklist
                items={[
                  {
                    id: "docs",
                    label: "All required documents attached",
                    completed: (application.docsUploaded ?? []).length >=
                      (application.docsRequired ?? []).length
                  },
                  ...(prompts.length > 0
                    ? [{
                        id: "prompts",
                        label: "Essay prompts completed",
                        completed: (application.promptResponses ?? []).length >= prompts.length &&
                          (application.promptResponses ?? []).every((r) => (r.response ?? "").trim().length > 0)
                      }]
                    : [{
                        id: "prompts",
                        label: "No essays required",
                        completed: true
                      }])
                ]}
              />
              {applyUrl ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 space-y-3">
                  <p className="text-sm font-medium text-amber-400">Submit on the official site</p>
                  <p className="text-xs text-[var(--muted)]">
                    Use the button below to open the scholarship&apos;s application page. Complete and submit there, then come back and mark as submitted here to track it.
                  </p>
                  <a
                    href={applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20"
                  >
                    Open application page
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              ) : (
                <div className="rounded-xl bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--muted)]">
                  No application link is stored for this scholarship. If you have the official apply URL, submit there, then mark as submitted below to track it.
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmOpen(true)}
              >
                Mark as submitted
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs">
          <h3 className="text-sm font-semibold font-heading">Application summary</h3>
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted-2)]">Status</span>
              <Badge variant="info">
                {application.status === "not_started"
                  ? "Not started"
                  : application.status === "drafting"
                  ? "Drafting"
                  : application.status === "reviewing"
                  ? "Reviewing"
                  : "Submitted"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted-2)]">Progress</span>
              <span className="font-medium text-amber-400">{application.progress}%</span>
            </div>
            <ProgressBar value={application.progress} />
            <div className="flex items-center justify-between">
              <span className="text-[var(--muted-2)]">Deadline</span>
              <span>
                {new Date(scholarship.deadline).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric"
                })}
              </span>
            </div>
            {application.status === "submitted" && !application.owlStatus && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[var(--muted-2)]">Result</span>
                <div className="flex gap-1">
                  {(["awaiting", "won", "rejected"] as const).map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => handleSetOutcome(o)}
                      className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                        application.outcome === o
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-[var(--bg-secondary)] text-[var(--muted)] hover:text-[var(--text)]"
                      }`}
                    >
                      {o === "awaiting" ? "Awaiting" : o === "won" ? "Won" : "Rejected"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        title="Mark as submitted?"
        description={
          applyUrl
            ? "Have you submitted on the official site? Open the link below if you haven't yet, then mark as submitted here to track it."
            : "This records that you've submitted elsewhere. We don't have a stored link for this scholarship."
        }
        primaryLabel="Mark submitted"
        onClose={() => setConfirmOpen(false)}
        onPrimary={handleMarkSubmitted}
      >
        {applyUrl && (
          <a
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/20 w-full justify-center"
          >
            Open application page
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </Modal>
      <Modal
        open={confirmDeleteOpen}
        title="Remove this application?"
        description="This will remove the application from your pipeline. Your drafts and progress will be lost."
        primaryLabel="Remove"
        destructive
        onClose={() => setConfirmDeleteOpen(false)}
        onPrimary={handleDelete}
      />
    </div>
  );
}
