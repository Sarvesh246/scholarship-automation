import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  primaryAction?: ReactNode;
}

export function PageHeader({ title, subtitle, primaryAction }: PageHeaderProps) {
  return (
    <div className="mb-6 flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-xl font-bold font-heading tracking-tight md:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--muted)]">
            {subtitle}
          </p>
        )}
      </div>
      {primaryAction && <div className="shrink-0">{primaryAction}</div>}
    </div>
  );
}
