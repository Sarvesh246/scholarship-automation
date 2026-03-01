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
    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  warning:
    "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  danger:
    "bg-red-500/10 text-red-400 border border-red-500/20",
  info:
    "bg-blue-500/10 text-blue-400 border border-blue-500/20"
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
