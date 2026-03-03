import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  clickable?: boolean;
}

export function Card({ children, className, clickable }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-[var(--surface)] transition-all",
        "border-[var(--card-border)] shadow-[var(--card-shadow)] p-[var(--card-padding)]",
        clickable &&
          "cursor-pointer hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-lg",
        className
      )}
    >
      {children}
    </div>
  );
}
