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
    <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs shadow-sm transition-all hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-md">
      <p className="text-xs font-semibold leading-snug">{card.title}</p>
      <div className="flex items-center gap-2 text-[10px] text-[var(--muted-2)]">
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
          className="flex flex-col gap-3 rounded-xl bg-[var(--bg-secondary)] p-3"
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
