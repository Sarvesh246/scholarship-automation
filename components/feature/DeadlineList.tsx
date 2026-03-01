"use client";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface DeadlineItem {
  id: string;
  title: string;
  scholarshipId: string;
  deadline: string;
  status: "not_started" | "in_progress" | "submitted";
}

interface DeadlineGroup {
  label: string;
  items: DeadlineItem[];
}

interface DeadlineListProps {
  groups: DeadlineGroup[];
  onResume?: (scholarshipId: string) => void;
}

export function DeadlineList({ groups, onResume }: DeadlineListProps) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label} className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <p className="font-medium text-[var(--muted)]">{group.label}</p>
            <span className="text-[10px] text-[var(--muted-2)]">
              {group.items.length} deadlines
            </span>
          </div>
          <div className="space-y-2 rounded-xl bg-[var(--bg-secondary)] p-2">
            {group.items.length === 0 && (
              <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-[10px] text-[var(--muted-2)]">
                Nothing urgent in this window.
              </p>
            )}
            {group.items.map((item) => {
              const date = new Date(item.deadline).toLocaleDateString(
                undefined,
                { month: "short", day: "numeric" }
              );
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-[var(--surface)] px-3 py-2.5 text-xs shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400 font-medium">
                      {date}
                    </span>
                    <div>
                      <p className="font-medium leading-snug">{item.title}</p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--muted-2)]">
                        <Badge
                          variant={
                            item.status === "submitted"
                              ? "success"
                              : item.status === "in_progress"
                              ? "info"
                              : "neutral"
                          }
                        >
                          {item.status === "submitted"
                            ? "Submitted"
                            : item.status === "in_progress"
                            ? "In progress"
                            : "Not started"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => onResume?.(item.scholarshipId)}
                  >
                    Resume
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
