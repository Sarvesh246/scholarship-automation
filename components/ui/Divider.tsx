interface DividerProps {
  label?: string;
}

export function Divider({ label }: DividerProps) {
  if (!label) {
    return <div className="h-px w-full bg-[var(--border)]" />;
  }
  return (
    <div className="flex items-center gap-3 text-xs text-[var(--muted-2)]">
      <div className="h-px flex-1 bg-[var(--border)]" />
      <span>{label}</span>
      <div className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}

