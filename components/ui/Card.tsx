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
        "rounded-md border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm",
        clickable &&
          "cursor-pointer transition hover:-translate-y-0.5 hover:border-[var(--text)] hover:shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}

