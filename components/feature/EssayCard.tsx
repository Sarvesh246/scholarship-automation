"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Essay } from "@/types";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import { duplicateEssay } from "@/lib/essayStorage";

interface EssayCardProps {
  essay: Essay;
  onReload?: () => void;
  usedInApplications?: number;
}

export const EssayCard = memo(function EssayCard({ essay, onReload, usedInApplications = 0 }: EssayCardProps) {
  const router = useRouter();
  const [duplicating, setDuplicating] = useState(false);
  const updated = new Date(essay.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
  const charCount = typeof essay.content === "string" ? essay.content.replace(/<[^>]*>/g, "").length : 0;
  const charMax = 5000;
  const charPct = Math.min(100, Math.round((charCount / charMax) * 100));

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDuplicating(true);
    try {
      const copy = await duplicateEssay(essay.id);
      if (copy) {
        onReload?.();
        router.push(`/app/essays/${copy.id}`);
      }
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <div className="group relative flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm shadow-sm transition-all hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-lg">
      <Link href={`/app/essays/${essay.id}`} className="absolute inset-0 z-0" aria-label={`Open essay: ${essay.title}`} />
      <div className="relative z-10 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug min-w-0 flex-1">{essay.title}</h3>
          <span className="text-right shrink-0 text-base font-bold tabular-nums text-amber-400">
            {essay.wordCount} <span className="text-[10px] font-normal text-[var(--muted-2)]">words</span>
          </span>
        </div>
        <div className="w-full h-1 rounded-full bg-[var(--border)] overflow-hidden">
          <div className="h-full rounded-full bg-amber-500/50 transition-all" style={{ width: `${charPct}%` }} />
        </div>
        <p className="text-[10px] text-[var(--muted-2)]">{charCount.toLocaleString()} / {charMax.toLocaleString()} characters</p>
        <div className="flex flex-wrap gap-1.5 items-center">
          {(essay.tags ?? []).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
          {(usedInApplications ?? 0) > 0 && (
            <span className="text-[10px] text-emerald-400/90 font-medium">Used in {usedInApplications} application{usedInApplications !== 1 ? "s" : ""}</span>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-[10px] text-[var(--muted-2)]">
            Edited {updated}
          </p>
          <span className="pointer-events-auto">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDuplicate}
              disabled={duplicating}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {duplicating ? "Copying…" : "Duplicate"}
            </Button>
          </span>
        </div>
      </div>
    </div>
  );
});
