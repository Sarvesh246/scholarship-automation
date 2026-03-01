import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  tabs: { value: string; label: string }[];
}

export function Tabs({ value, onChange, tabs }: TabsProps) {
  return (
    <div className="inline-flex rounded-full bg-[var(--surface)] border border-[var(--border)] p-1 text-xs">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            "rounded-full px-3 py-1 font-medium text-[var(--muted)] transition",
            value === tab.value &&
              "bg-amber-500/10 text-amber-400 shadow-sm"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

interface TabListProps {
  children: ReactNode;
}

export function TabList({ children }: TabListProps) {
  return <div className="flex gap-2 border-b border-[var(--border)] pb-1">{children}</div>;
}

interface TabProps {
  value: string;
  current: string;
  onChange: (value: string) => void;
  children: ReactNode;
}

export function Tab({ value, current, onChange, children }: TabProps) {
  const isActive = value === current;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={cn(
        "border-b-2 px-2 pb-2 text-xs font-medium text-[var(--muted)]",
        isActive
          ? "border-amber-500 text-amber-400"
          : "border-transparent hover:text-[var(--text)]"
      )}
    >
      {children}
    </button>
  );
}
