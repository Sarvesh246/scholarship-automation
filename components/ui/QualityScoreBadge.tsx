"use client";

import { useState, useRef, useEffect } from "react";
import { getQualityBreakdown } from "@/lib/scholarshipQuality";
import type { Scholarship } from "@/types";

interface QualityScoreBadgeProps {
  scholarship: Scholarship;
  /** When true, show compact "87" only. */
  compact?: boolean;
  className?: string;
}

export function QualityScoreBadge({ scholarship, compact = false, className = "" }: QualityScoreBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  const { score, reasons } = getQualityBreakdown(scholarship);
  if (score <= 0) return null;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const tier = score >= 70 ? "high" : score >= 50 ? "medium" : "low";
  const tierClass =
    tier === "high"
      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
      : tier === "medium"
        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
        : "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]";

  return (
    <span ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold cursor-help transition-colors ${tierClass}`}
        title="Quality score — click for breakdown"
      >
        Quality: {score}/100
        {compact ? null : (
          <span className="text-[9px] opacity-80">Why?</span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 min-w-[180px] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-lg">
          <p className="text-[10px] font-medium text-[var(--muted-2)] mb-1.5">Why this score?</p>
          <ul className="space-y-0.5 text-[11px] text-[var(--text)]">
            {reasons.map((r) => (
              <li key={r} className="flex items-center gap-1.5">
                {r.includes("unknown") || r.includes("unclear") || r.includes("notes") ? (
                  <span className="text-amber-500">·</span>
                ) : (
                  <span className="text-emerald-500 dark:text-emerald-400">✓</span>
                )}
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}
