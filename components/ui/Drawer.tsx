import { ReactNode, useEffect } from "react";

interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Drawer({ open, title, onClose, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-[var(--overlay)]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="relative h-full w-full max-w-sm border-l border-[var(--border)] bg-[var(--bg-secondary)] p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold font-heading">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[var(--muted)] hover:text-amber-400 transition-colors"
            aria-label={`Close ${title}`}
          >
            Close
          </button>
        </div>
        <div className="space-y-4 text-sm">{children}</div>
      </div>
    </div>
  );
}
