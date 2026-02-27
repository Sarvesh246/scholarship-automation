import { ReactNode } from "react";
import { ApplicationStatus } from "@/types";
import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";

export interface PipelineCardData {
  id: string;
  title: string;
  amount?: number;
  deadline?: string;
  status: ApplicationStatus;
  progress: number;
  nextTask: string;
}

interface PipelineColumnProps {
  title: string;
  status: ApplicationStatus;
  cards: PipelineCardData[];
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

function ApplicationCard({ card }: { card: PipelineCardData }) {
  return (
    <div className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-xs shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--text)] hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold leading-snug">{card.title}</p>
        {card.amount && (
          <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] text-[var(--muted-2)]">
            {formatAmount(card.amount)}
          </span>
        )}
      </div>
      {card.deadline && (
        <p className="text-[10px] text-[var(--muted-2)]">
          Due {formatDeadline(card.deadline)}
        </p>
      )}
      <div className="mt-1">
        <ProgressBar value={card.progress} />
        <p className="mt-1 text-[10px] text-[var(--muted-2)]">
          Next: {card.nextTask}
        </p>
      </div>
    </div>
  );
}

interface PipelineBoardProps {
  applications: PipelineCardData[];
}

export function PipelineBoard({ applications }: PipelineBoardProps) {
  const columns: { title: string; status: ApplicationStatus }[] = [
    { title: "Not started", status: "not_started" },
    { title: "Drafting", status: "drafting" },
    { title: "Reviewing", status: "reviewing" },
    { title: "Submitted", status: "submitted" }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {columns.map((column) => (
        <div
          key={column.status}
          className="flex flex-col gap-3 rounded-md bg-[var(--surface-2)]/70 p-3"
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
                <ApplicationCard key={card.id} card={card} />
              ))}
            {applications.filter((a) => a.status === column.status).length ===
              0 && (
              <p className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] px-2 py-3 text-[10px] text-[var(--muted-2)]">
                No applications here yet.
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

