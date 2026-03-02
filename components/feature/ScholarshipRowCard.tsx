import { memo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Scholarship } from "@/types";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";

interface Props {
  scholarship: Scholarship;
  hasApplication?: boolean;
  onStartApplication?: (scholarship: Scholarship) => Promise<void>;
  onDelete?: () => void;
}

export const ScholarshipRowCard = memo(function ScholarshipRowCard({
  scholarship,
  hasApplication = false,
  onStartApplication,
  onDelete
}: Props) {
  const [saved, setSaved] = useState(false);
  const [starting, setStarting] = useState(false);
  const router = useRouter();

  const handleDeleteClick = useCallback(() => {
    if (!onDelete) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${scholarship.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    onDelete();
  }, [onDelete, scholarship.title]);

  const deadline = new Date(scholarship.deadline).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric", year: "numeric" }
  );

  const handleStart = useCallback(() => {
    if (hasApplication) {
      router.push(`/app/applications/${scholarship.id}`);
      return;
    }
    if (onStartApplication) {
      setStarting(true);
      onStartApplication(scholarship).finally(() => setStarting(false));
    } else {
      router.push(`/app/applications/${scholarship.id}`);
    }
  }, [hasApplication, scholarship, onStartApplication, router]);

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-sm shadow-sm transition-all hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-lg">
      <div className="min-w-0 flex-1 space-y-1">
        <Link
          href={`/app/scholarships/${scholarship.id}`}
          className="font-semibold hover:text-amber-400 transition-colors"
        >
          {scholarship.title}
        </Link>
        <p className="text-xs text-[var(--muted-2)]">
          {scholarship.sponsor}
        </p>
        <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--muted)]">
          <span className="flex items-center gap-1">
            <span className="text-amber-400 font-medium">
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
          disabled={starting}
        >
          {starting ? "Starting…" : hasApplication ? "Continue" : "Start"}
        </Button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={saved ? "Remove bookmark" : "Save scholarship"}
            className="text-xs text-[var(--muted-2)] hover:text-amber-400 transition-colors"
            onClick={() => setSaved((v) => !v)}
          >
            {saved ? "Saved" : "Save"}
          </button>
          {onDelete && (
            <button
              type="button"
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
              onClick={handleDeleteClick}
              aria-label={`Delete ${scholarship.title}`}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
