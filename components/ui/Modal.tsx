import { ReactNode } from "react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onClose: () => void;
  onPrimary?: () => void;
  onSecondary?: () => void;
  destructive?: boolean;
  children?: ReactNode;
}

export function Modal({
  open,
  title,
  description,
  primaryLabel = "Confirm",
  secondaryLabel = "Cancel",
  onClose,
  onPrimary,
  onSecondary,
  destructive,
  children
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-md bg-[var(--surface)] p-6 shadow-lg">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>
        )}
        {children && <div className="mt-4 text-sm">{children}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              onSecondary?.();
              onClose();
            }}
          >
            {secondaryLabel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={destructive ? "destructive" : "primary"}
            className={cn(destructive && "text-white")}
            onClick={() => {
              onPrimary?.();
              onClose();
            }}
          >
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

