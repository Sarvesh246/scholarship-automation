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
          "h-11 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg)]",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

