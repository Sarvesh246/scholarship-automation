import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const badgeClasses: Record<BadgeVariant, string> = {
  neutral:
    "bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)]",
  success:
    "bg-[var(--success-soft)] text-[var(--success)] border border-[var(--success-soft)]",
  warning:
    "bg-[var(--warning-soft)] text-[var(--warning)] border border-[var(--warning-soft)]",
  danger:
    "bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger-soft)]",
  info: "bg-[var(--info-soft)] text-[var(--info)] border border-[var(--info-soft)]"
};

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

