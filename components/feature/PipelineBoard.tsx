import { memo } from "react";
import Link from "next/link";
import { ApplicationStatus } from "@/types";
import type { ApplicationOutcome } from "@/types";
import { cn, decodeHtmlEntities, displayScholarshipTitle } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";

export interface PipelineCardData {
  id: string;
  title: string;
  amount?: number;
  deadline?: string;
  status: ApplicationStatus;
  progress: number;
  nextTask: string;
  /** When applied via ScholarshipOwl: received | review | accepted | rejected */
  owlStatus?: "received" | "review" | "accepted" | "rejected";
  /** After submission: awaiting decision, won, or rejected. */
  outcome?: ApplicationOutcome;
}

function formatAmount(amount?: number) {
  if (!amount) return "";
  return `$${amount.toLocaleString()}`;
}

function formatDeadline(deadline?: string) {
  if (!deadline) return "";
  return new Date(deadline).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

const OWL_STATUS_LABEL: Record<string, string> = {
  received: "Received",
  review: "Under review",
  accepted: "Accepted",
  rejected: "Rejected"
};

const ApplicationCard = memo(function ApplicationCard({
  card,
  href,
  onDelete
}: {
  card: PipelineCardData;
  href?: string;
  onDelete?: (applicationId: string) => void;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug min-w-0 flex-1">{displayScholarshipTitle(card.title) || "Application"}</p>
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(card.id);
            }}
            className="shrink-0 rounded p-1 text-[10px] text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            aria-label="Delete application"
          >
            Delete
          </button>
        )}
      </div>
      {card.status === "submitted" && card.owlStatus && (
        <Badge
          variant={
            card.owlStatus === "accepted"
              ? "success"
              : card.owlStatus === "rejected"
                ? "danger"
                : "info"
          }
          className="mt-1"
        >
          {OWL_STATUS_LABEL[card.owlStatus] ?? card.owlStatus}
        </Badge>
      )}
      {card.status === "submitted" && card.outcome && !card.owlStatus && (
        <Badge
          variant={
            card.outcome === "won"
              ? "success"
              : card.outcome === "rejected"
                ? "danger"
                : "info"
          }
          className="mt-1"
        >
          {card.outcome === "awaiting" ? "Awaiting" : card.outcome === "won" ? "Won" : "Rejected"}
        </Badge>
      )}
      {(card.amount ?? card.deadline) && (
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-[var(--muted-2)]">
          {card.amount && (
            <span className="text-amber-400 font-medium">{formatAmount(card.amount)}</span>
          )}
          {card.amount && card.deadline && <span>·</span>}
          {card.deadline && <span>Due {formatDeadline(card.deadline)}</span>}
        </div>
      )}
      <div className="mt-2 pt-2 border-t border-[var(--border)]">
        <ProgressBar value={card.progress} />
        <p className="mt-1.5 text-[11px] font-medium text-[var(--muted)]">
          Next step: {card.nextTask.replace(/^Review requirements and prompts$/i, "Review requirements").replace(/^Next:?\s*/i, "")}
        </p>
      </div>
    </>
  );

  const className = cn(
    "space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-xs shadow-sm transition-all hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-md",
    href && "cursor-pointer block text-left"
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
});

interface PipelineBoardProps {
  applications: PipelineCardData[];
  /** When provided, each card links to this path (receives application id). Omit on dashboard to keep cards non-clickable. */
  getCardHref?: (applicationId: string) => string;
  /** When provided, each card shows a delete button that calls this with the application id. */
  onDelete?: (applicationId: string) => void;
}

const COLUMNS: { title: string; status: ApplicationStatus }[] = [
  { title: "Not started", status: "not_started" },
  { title: "Drafting", status: "drafting" },
  { title: "Reviewing", status: "reviewing" },
  { title: "Submitted", status: "submitted" }
];

function groupByStatus(applications: PipelineCardData[]) {
  const map = new Map<ApplicationStatus, PipelineCardData[]>();
  for (const a of applications) {
    const list = map.get(a.status) ?? [];
    list.push(a);
    map.set(a.status, list);
  }
  return map;
}

export function PipelineBoard({ applications, getCardHref, onDelete }: PipelineBoardProps) {
  const byStatus = groupByStatus(applications);

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {COLUMNS.map((column, idx) => {
        const columnApps = byStatus.get(column.status) ?? [];
        const colBg = idx % 2 === 0 ? "bg-[var(--surface)]" : "bg-[var(--surface-2)]";
        return (
        <div
          key={column.status}
          className={cn("flex flex-col gap-3 rounded-xl p-3 min-w-0", colBg)}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--muted)]">
              {column.title}
            </span>
            <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] text-[var(--muted-2)]">
              {columnApps.length}
            </span>
          </div>
          <div className={cn("space-y-2", "min-h-[60px]")}>
            {columnApps.map((card) => (
                <ApplicationCard
                  key={card.id}
                  card={card}
                  href={getCardHref?.(card.id)}
                  onDelete={onDelete}
                />
              ))}
            {columnApps.length === 0 && (
              <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-2 py-3 text-[10px] text-[var(--muted-2)]">
                No applications here yet.
              </p>
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
}
