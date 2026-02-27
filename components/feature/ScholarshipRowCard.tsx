import Link from "next/link";
import { useRouter } from "next/navigation";
import { Scholarship } from "@/types";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

interface Props {
  scholarship: Scholarship;
}

export function ScholarshipRowCard({ scholarship }: Props) {
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const deadline = new Date(scholarship.deadline).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric", year: "numeric" }
  );

  const handleStart = () => {
    router.push(`/app/applications/app-${scholarship.id}`);
  };

  return (
    <div className="flex items-center gap-4 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--text)] hover:shadow-md">
      <div className="min-w-0 flex-1 space-y-1">
        <Link
          href={`/app/scholarships/${scholarship.id}`}
          className="font-semibold hover:underline"
        >
          {scholarship.title}
        </Link>
        <p className="text-xs text-[var(--muted-2)]">
          {scholarship.sponsor}
        </p>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
          <span>
            Amount:{" "}
            <span className="font-medium">
              ${scholarship.amount.toLocaleString()}
            </span>
          </span>
          <span>Deadline: {deadline}</span>
          <span>Effort: {scholarship.estimatedTime}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {scholarship.categoryTags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleStart}
        >
          Start
        </Button>
        <button
          type="button"
          aria-label={saved ? "Remove bookmark" : "Save scholarship"}
          className="text-xs text-[var(--muted-2)] hover:text-[var(--text)]"
          onClick={() => setSaved((v) => !v)}
        >
          {saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

