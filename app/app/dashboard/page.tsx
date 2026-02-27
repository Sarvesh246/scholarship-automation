import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PipelineBoard } from "@/components/feature/PipelineBoard";
import { DeadlineList } from "@/components/feature/DeadlineList";
import { applications, deadlines, scholarships } from "@/data/mockData";

function getDeadlinesForNextWeeks(days: number) {
  const now = new Date();
  const limit = new Date(now);
  limit.setDate(now.getDate() + days);
  return deadlines.filter((d) => {
    const date = new Date(d.deadline);
    return date >= now && date <= limit;
  });
}

export default function DashboardPage() {
  const deadlinesThisWeek = getDeadlinesForNextWeeks(7);
  const inProgress = applications.filter(
    (a) => a.status !== "submitted"
  ).length;
  const dueSoon = deadlinesThisWeek.length;
  const estimatedSum = applications
    .filter((a) => a.status !== "not_started")
    .map((a) =>
      scholarships.find((s) => s.id === a.scholarshipId)?.amount ?? 0
    )
    .reduce((sum, amount) => sum + amount, 0);

  const pipelineCards = applications.map((app) => {
    const scholarship = scholarships.find((s) => s.id === app.scholarshipId);
    return {
      id: app.id,
      title: scholarship?.title ?? "Application",
      amount: scholarship?.amount,
      deadline: scholarship?.deadline,
      status: app.status,
      progress: app.progress,
      nextTask: app.nextTask
    };
  });

  const today = new Date();
  const todayGroup = {
    label: "Today",
    items: deadlines.filter((d) => {
      const date = new Date(d.deadline);
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    })
  };
  const thisWeekGroup = {
    label: "This week",
    items: deadlinesThisWeek.filter(
      (d) => !todayGroup.items.some((t) => t.id === d.id)
    )
  };
  const nextTwoWeeksGroup = {
    label: "Next 2 weeks",
    items: getDeadlinesForNextWeeks(14).filter(
      (d) => !todayGroup.items.concat(thisWeekGroup.items).some((t) => t.id === d.id)
    )
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={`You have ${deadlinesThisWeek.length} deadlines this week.`}
        primaryAction={
          <Link
            href="/app/scholarships"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-hover)]"
          >
            Start application
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-[var(--muted-2)]">Matched scholarships</p>
          <p className="mt-2 text-2xl font-semibold">
            {scholarships.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--muted-2)]">In progress</p>
          <p className="mt-2 text-2xl font-semibold">{inProgress}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--muted-2)]">Due soon (7 days)</p>
          <p className="mt-2 text-2xl font-semibold">{dueSoon}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--muted-2)]">Estimated $ applied</p>
          <p className="mt-2 text-2xl font-semibold">
            ${estimatedSum.toLocaleString()}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[var(--muted)]">
            Applications pipeline
          </h2>
          <PipelineBoard applications={pipelineCards} />
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[var(--muted)]">
            Upcoming deadlines
          </h2>
          <DeadlineList
            groups={[todayGroup, thisWeekGroup, nextTwoWeeksGroup]}
          />
        </div>
      </div>
    </div>
  );
}

