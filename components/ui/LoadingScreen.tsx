"use client";

import { cn } from "@/lib/utils";

export interface LoadingScreenProps {
  /** Short context message, e.g. "Loading essay…" */
  message?: string;
  /** Use when the loader is inline (e.g. inside a card) rather than full-page. */
  compact?: boolean;
  className?: string;
}

/**
 * Themed loading state so users know something is loading, not frozen.
 * Matches site vibe: warm amber accent, clean surface, rounded.
 */
export function LoadingScreen({
  message = "Loading…",
  compact = false,
  className,
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-center",
        compact ? "py-8 px-6" : "min-h-[200px] py-12 px-8",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div
        className="h-8 w-8 shrink-0 rounded-full border-2 border-[var(--surface-2)] border-t-amber-500 motion-safe:animate-spin"
        aria-hidden
      />
      <p className="text-sm font-medium text-[var(--text)]">{message}</p>
      <p className="text-xs text-[var(--muted)]">This may take a moment</p>
    </div>
  );
}

/**
 * Full-page loading layout: same padding as app pages, with LoadingScreen inside.
 * Use in client pages while data is loading.
 */
export function LoadingScreenBlock({
  message,
  className,
}: Pick<LoadingScreenProps, "message" | "className">) {
  return (
    <div className={cn("space-y-6 px-6 pb-8 pt-6 md:px-8", className)}>
      <div className="mx-auto max-w-6xl">
        <LoadingScreen message={message} />
      </div>
    </div>
  );
}
