import { ReactNode, useState, createContext, useContext } from "react";
import { cn } from "@/lib/utils";

const DropdownContext = createContext<{ close: () => void } | null>(null);

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
}

export function DropdownMenu({
  trigger,
  children,
  align = "end"
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-flex text-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="focus:outline-none"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </button>
      {open && (
        <DropdownContext.Provider value={{ close: () => setOpen(false) }}>
          <div
            className={cn(
              "absolute z-30 mt-2 min-w-[160px] rounded-md border border-[var(--border)] bg-[var(--surface)] p-1 text-xs shadow-md",
              align === "end" ? "right-0" : "left-0"
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
        "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-[var(--muted)] hover:bg-[var(--surface-2)]",
        danger && "text-[var(--danger)] hover:bg-[var(--danger-soft)]"
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

