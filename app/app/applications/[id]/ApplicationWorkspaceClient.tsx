"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getApplication, updateApplicationStatus } from "@/lib/applicationStorage";
import { getScholarships } from "@/lib/scholarshipStorage";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Checklist } from "@/components/feature/Checklist";
import { DocumentSlot } from "@/components/feature/DocumentSlot";
import { PromptBlock } from "@/components/feature/PromptBlock";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import type { Application, Scholarship } from "@/types";

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

  const loadData = useCallback(async () => {
    const [app, schols] = await Promise.all([getApplication(id), getScholarships()]);
    setApplication(app);
    if (app) {
      setScholarship(schols.find((s) => s.id === app.scholarshipId) ?? null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
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

  const steps: { key: StepKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "eligibility", label: "Eligibility" },
    { key: "documents", label: "Documents" },
    { key: "prompts", label: "Prompts" },
    { key: "final", label: "Final review" }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={scholarship.title}
        subtitle="Application workspace"
        primaryAction={
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Back
          </Button>
        }
      />

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
                <p className="text-xs text-[var(--text)] leading-relaxed">
                  {scholarship.description}
                </p>
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
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-[var(--muted)]">
                {scholarship.eligibilityTags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </div>
          )}
          {step === "documents" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold font-heading">Documents</h3>
              <div className="space-y-2">
                {application.docsRequired.map((doc) => (
                  <DocumentSlot
                    key={doc}
                    label={doc}
                    uploaded={application.docsUploaded.includes(doc)}
                  />
                ))}
              </div>
            </div>
          )}
          {step === "prompts" && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold font-heading">Prompts</h3>
              {scholarship.prompts.map((prompt, index) => (
                <PromptBlock
                  key={index}
                  prompt={prompt}
                  value={application.promptResponses[index]?.response ?? ""}
                  onChange={() => {}}
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
                    completed: application.docsUploaded.length >=
                      application.docsRequired.length
                  },
                  {
                    id: "prompts",
                    label: "Essay prompts have at least one draft",
                    completed: application.promptResponses.length > 0
                  }
                ]}
              />
              <div className="rounded-xl bg-[var(--bg-secondary)] px-3 py-2 text-xs text-[var(--muted)]">
                Export and submission are currently placeholders. Use this
                checklist to confirm you are ready to submit on the official
                scholarship website.
              </div>
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
          </div>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        title="Mark as submitted?"
        description="This won't actually send anything, but helps you track what's been submitted."
        primaryLabel="Mark submitted"
        onClose={() => setConfirmOpen(false)}
        onPrimary={handleMarkSubmitted}
      />
    </div>
  );
}
