import { ReactNode } from "react";
import { Button } from "./Button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center">
      {icon && <div className="mb-3 text-[var(--muted)]">{icon}</div>}
      <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
      <p className="mt-1 max-w-md text-xs text-[var(--muted)]">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          type="button"
          size="sm"
          className="mt-4"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

