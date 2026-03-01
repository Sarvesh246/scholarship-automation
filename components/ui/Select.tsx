import { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, className, id, children, ...props }: SelectProps) {
  const selectId = id || props.name;
  return (
    <div className="space-y-1.5 text-sm">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-medium text-[var(--muted)]"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          "h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] shadow-sm transition-all focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
