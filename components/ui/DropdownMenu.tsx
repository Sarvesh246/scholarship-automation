import { ReactNode, useState, useRef, useEffect, createContext, useContext } from "react";
import { cn } from "@/lib/utils";

const DropdownContext = createContext<{ close: () => void } | null>(null);

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  contentClassName?: string;
  ariaLabel?: string;
}

export function DropdownMenu({
  trigger,
  children,
  align = "end",
  contentClassName,
  ariaLabel
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((v) => !v);
    }
  };

  return (
    <div ref={containerRef} className="relative inline-flex text-sm">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        className="focus:outline-none cursor-pointer"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        {trigger}
      </div>
      {open && (
        <DropdownContext.Provider value={{ close: () => setOpen(false) }}>
          <div
            className={cn(
              "absolute z-30 mt-2 min-w-[160px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 text-xs shadow-lg",
              align === "end" ? "right-0" : "left-0",
              contentClassName
            )}
          >
            {children}
          </div>
        </DropdownContext.Provider>
      )}
    </div>
  );
}

interface DropdownItemProps {
  children: ReactNode;
  onSelect?: () => void;
  danger?: boolean;
}

export function DropdownItem({
  children,
  onSelect,
  danger
}: DropdownItemProps) {
  const ctx = useContext(DropdownContext);

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center rounded-lg px-2 py-1.5 text-left text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors",
        danger && "text-red-400 hover:bg-red-500/10 hover:text-red-400"
      )}
      onClick={() => {
        ctx?.close();
        onSelect?.();
      }}
    >
      {children}
    </button>
  );
}
