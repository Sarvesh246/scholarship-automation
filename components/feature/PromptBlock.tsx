import Link from "next/link";
import { Textarea } from "@/components/ui/Textarea";
import type { Essay } from "@/types";

interface PromptBlockProps {
  prompt: string;
  value: string;
  onChange: (value: string) => void;
  /** Essays that might fit this prompt (from tag/prompt matching). */
  suggestedEssays?: Essay[];
}

export function PromptBlock({ prompt, value, onChange, suggestedEssays }: PromptBlockProps) {
  return (
    <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm shadow-sm">
      <p className="text-xs font-medium text-[var(--text)]">{prompt}</p>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Draft your response here..."
      />
      {suggestedEssays && suggestedEssays.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2">
          <p className="text-[10px] font-medium text-[var(--muted-2)] mb-1.5">Essays that might fit</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedEssays.map((e) => (
              <Link
                key={e.id}
                href={`/app/essays/${e.id}`}
                className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-400 hover:bg-amber-500/20"
              >
                {e.title}
                <span className="text-[var(--muted-2)]">({e.wordCount}w)</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <p className="text-[10px] text-[var(--muted-2)]">
        Autosave: <span className="font-medium text-emerald-400">Saved just now</span>
      </p>
    </div>
  );
}
