import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, className, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-1.5 text-sm">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-[var(--muted)]"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] shadow-sm placeholder:text-[var(--muted-2)] transition-all focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20",
            className
          )}
          {...props}
        />
        {hint && (
          <p className="text-xs text-[var(--muted-2)]">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
