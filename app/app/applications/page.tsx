"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Tabs } from "@/components/ui/Tabs";
import { PipelineBoard } from "@/components/feature/PipelineBoard";
import { Modal } from "@/components/ui/Modal";
import { LoadingScreenBlock } from "@/components/ui/LoadingScreen";
import { useToast } from "@/components/ui/Toast";
import { getApplications, deleteApplication } from "@/lib/applicationStorage";
import { getScholarships, getScholarship } from "@/lib/scholarshipStorage";
import { decodeHtmlEntities, displayScholarshipTitle } from "@/lib/utils";
import type { Application, Scholarship } from "@/types";

export default function ApplicationsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [view, setView] = useState<"board" | "list">("board");
  const [applications, setApplications] = useState<Application[]>([]);
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [apps, schols] = await Promise.all([getApplications(), getScholarships()]);
    setApplications(apps);
    setScholarships(schols);
    setLoading(false);
  }, []);

  const handleDelete = useCallback(async () => {
    const id = deleteTarget;
    setDeleteTarget(null);
    if (!id) return;
    try {
      await deleteApplication(id);
      await loadData();
      showToast({ title: "Application removed", variant: "success" });
    } catch {
      showToast({ title: "Could not remove application", message: "Please try again.", variant: "danger" });
    }
  }, [deleteTarget, loadData, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load scholarship details for any application whose scholarship isn't in the first-page cache
  useEffect(() => {
    if (applications.length === 0) return;
    const ids = new Set(applications.map((a) => a.scholarshipId));
    const missingIds = [...ids].filter((id) => !scholarships.some((s) => s.id === id));
    if (missingIds.length === 0) return;
    let cancelled = false;
    (async () => {
      const fetched = await Promise.all(missingIds.map((id) => getScholarship(id)));
      if (cancelled) return;
      const added = fetched.filter((s): s is Scholarship => s != null);
      if (added.length > 0) setScholarships((prev) => [...prev, ...added]);
    })();
    return () => { cancelled = true; };
  }, [applications, scholarships]);

  useEffect(() => {
    const onFocus = () => { loadData(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadData]);

  const cards = useMemo(
    () =>
      applications.map((app) => {
        const scholarship = scholarships.find((s) => s.id === app.scholarshipId);
        const rawTitle = displayScholarshipTitle(scholarship?.title ?? "");
        return {
          id: app.id,
          title: rawTitle.trim() || "Application",
          amount: scholarship?.amount,
          deadline: scholarship?.deadline,
          status: app.status,
          progress: app.progress,
          nextTask: app.nextTask,
          owlStatus: app.owlStatus
        };
      }),
    [applications, scholarships]
  );

  if (loading) {
    return <LoadingScreenBlock message="Loading applications…" />;
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
        <EmptyState
          title="No applications yet"
          description="Start an application from the Scholarships page to see it here."
          actionLabel="Browse scholarships"
          onAction={() => router.push("/app/scholarships")}
        />
      ) : view === "board" ? (
        <>
          <PipelineBoard
            applications={cards}
            getCardHref={(id) => `/app/applications/${id}`}
            onDelete={(id) => setDeleteTarget(id)}
          />
          <Modal
            open={!!deleteTarget}
            title="Remove this application?"
            description="This will remove the application from your pipeline. Your drafts and progress will be lost."
            primaryLabel="Remove"
            destructive
            onClose={() => setDeleteTarget(null)}
            onPrimary={handleDelete}
          />
        </>
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
                    {scholarship ? displayScholarshipTitle(scholarship.title) : "Application"}
                  </p>
                  <p className="text-[10px] text-[var(--muted-2)]">
                    {scholarship ? decodeHtmlEntities(scholarship.sponsor) : ""}
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
