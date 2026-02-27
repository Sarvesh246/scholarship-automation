import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TagProps {
  children: ReactNode;
  className?: string;
}

export function Tag({ children, className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs text-[var(--muted)]",
        className
      )}
    >
      {children}
    </span>
  );
}

