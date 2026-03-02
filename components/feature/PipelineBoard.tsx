import { memo } from "react";
import Link from "next/link";
import { ApplicationStatus } from "@/types";
import { cn } from "@/lib/utils";
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
  href
}: {
  card: PipelineCardData;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-sm font-semibold leading-snug">{card.title}</p>
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
      <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-[var(--muted-2)]">
        {card.amount && (
          <span className="text-amber-400 font-medium">{formatAmount(card.amount)}</span>
        )}
        {card.amount && card.deadline && <span>·</span>}
        {card.deadline && <span>Due {formatDeadline(card.deadline)}</span>}
      </div>
      <div className="mt-1">
        <ProgressBar value={card.progress} />
        <p className="mt-1 text-[10px] text-[var(--muted-2)]">
          Next: {card.nextTask}
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
}

export function PipelineBoard({ applications, getCardHref }: PipelineBoardProps) {
  const columns: { title: string; status: ApplicationStatus }[] = [
    { title: "Not started", status: "not_started" },
    { title: "Drafting", status: "drafting" },
    { title: "Reviewing", status: "reviewing" },
    { title: "Submitted", status: "submitted" }
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {columns.map((column) => (
        <div
          key={column.status}
          className="flex flex-col gap-3 rounded-xl bg-[var(--bg-secondary)] p-3 min-w-0"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--muted)]">
              {column.title}
            </span>
            <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] text-[var(--muted-2)]">
              {applications.filter((a) => a.status === column.status).length}
            </span>
          </div>
          <div className={cn("space-y-2", "min-h-[60px]")}>
            {applications
              .filter((a) => a.status === column.status)
              .map((card) => (
                <ApplicationCard
                  key={card.id}
                  card={card}
                  href={getCardHref?.(card.id)}
                />
              ))}
            {applications.filter((a) => a.status === column.status).length ===
              0 && (
              <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-2 py-3 text-[10px] text-[var(--muted-2)]">
                No applications here yet.
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
