interface ProgressBarProps {
  value: number;
}

export function ProgressBar({ value }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 w-full rounded-full bg-[var(--border)]">
      <div
        className="h-1.5 rounded-full bg-[var(--primary)] transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

