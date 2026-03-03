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
}

export const EssayCard = memo(function EssayCard({ essay, onReload }: EssayCardProps) {
  const router = useRouter();
  const [duplicating, setDuplicating] = useState(false);
  const updated = new Date(essay.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });

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
          <h3 className="text-sm font-semibold leading-snug">{essay.title}</h3>
          <span className="text-[10px] text-[var(--muted-2)]">
            {essay.wordCount} words
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(essay.tags ?? []).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
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
