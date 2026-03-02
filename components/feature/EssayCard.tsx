import { memo } from "react";
import Link from "next/link";
import { Essay } from "@/types";
import { Tag } from "@/components/ui/Tag";

interface EssayCardProps {
  essay: Essay;
}

export const EssayCard = memo(function EssayCard({ essay }: EssayCardProps) {
  const updated = new Date(essay.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });

  return (
    <Link
      href={`/app/essays/${essay.id}`}
      className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm shadow-sm transition-all hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug">{essay.title}</h3>
        <span className="text-[10px] text-[var(--muted-2)]">
          {essay.wordCount} words
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {essay.tags.map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-[var(--muted-2)]">
        Edited {updated}
      </p>
    </Link>
  );
});
