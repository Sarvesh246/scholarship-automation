"use client";

import { ReactNode, useEffect } from "react";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  onClose: () => void;
  onPrimary?: () => void | Promise<void>;
  onSecondary?: () => void;
  /** If true (default), modal closes immediately when primary is clicked. If false, caller must call onClose() after onPrimary completes (e.g. for async submit). */
  closeOnPrimaryClick?: boolean;
  primaryDisabled?: boolean;
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
  closeOnPrimaryClick = true,
  primaryDisabled,
  destructive,
  children
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const handlePrimary = async () => {
    await onPrimary?.();
    if (closeOnPrimaryClick) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[var(--overlay)] px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
        <div className="shrink-0 px-6 pt-6">
          <h2 className="text-sm font-semibold font-heading">{title}</h2>
          {description && (
            <p className="mt-1 text-xs text-[var(--muted)]">{description}</p>
          )}
        </div>
        {children && (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 text-sm">
            {children}
          </div>
        )}
        <div className="shrink-0 flex justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
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
            onClick={() => {
              handlePrimary();
            }}
            disabled={primaryDisabled}
          >
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
