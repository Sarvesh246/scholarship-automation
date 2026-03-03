import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  checked: boolean;
  "aria-label": string;
}

export function Switch({ checked, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] transition-colors duration-[400ms] ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-[var(--bg)]",
        checked && "bg-[var(--primary-soft)] border-[var(--primary)]",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "absolute top-1/2 h-3.5 w-3.5 shrink-0 -translate-y-1/2 rounded-full bg-[var(--muted-2)] transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          checked && "left-auto right-0.5 bg-[var(--primary)]",
          !checked && "left-0.5 right-auto"
        )}
      />
    </button>
  );
}
