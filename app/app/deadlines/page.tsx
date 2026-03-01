"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { DeadlineList } from "@/components/feature/DeadlineList";
import { deadlines } from "@/data/mockData";

export default function DeadlinesPage() {
  const now = new Date();
  const oneWeek = new Date(now);
  oneWeek.setDate(now.getDate() + 7);
  const twoWeeks = new Date(now);
  twoWeeks.setDate(now.getDate() + 14);

  const thisWeek = deadlines.filter((d) => {
    const date = new Date(d.deadline);
    return date >= now && date <= oneWeek;
  });
  const nextWeek = deadlines.filter((d) => {
    const date = new Date(d.deadline);
    return date > oneWeek && date <= twoWeeks;
  });
  const later = deadlines.filter((d) => {
    const date = new Date(d.deadline);
    return date > twoWeeks;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deadlines"
        subtitle="See what's due this week and beyond."
      />
      <DeadlineList
        groups={[
          { label: "This week", items: thisWeek },
          { label: "Next week", items: nextWeek },
          { label: "Later", items: later }
        ]}
      />
    </div>
  );
}
