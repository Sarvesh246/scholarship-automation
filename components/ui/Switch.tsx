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
        "relative inline-flex h-5 w-9 items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg)]",
        checked && "bg-[var(--primary-soft)] border-[var(--primary)]",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-[var(--muted-2)] transition-transform",
          checked && "translate-x-3.5 bg-[var(--primary)]",
          !checked && "translate-x-0.5"
        )}
      />
    </button>
  );
}

