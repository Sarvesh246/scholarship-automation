"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState
} from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "warning" | "danger";

interface ToastOptions {
  title: string;
  message?: string;
  variant?: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastInternal extends ToastOptions {
  id: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const variantStyles = {
  default: {
    accent: "bg-amber-500",
    bg: "bg-[var(--surface)] border-[var(--border)]",
    iconBg: "bg-amber-500/15 text-amber-400",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  success: {
    accent: "bg-emerald-500",
    bg: "bg-[var(--surface)] border-emerald-500/25",
    iconBg: "bg-emerald-500/15 text-emerald-400",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  warning: {
    accent: "bg-amber-500",
    bg: "bg-[var(--surface)] border-amber-500/25",
    iconBg: "bg-amber-500/15 text-amber-400",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  danger: {
    accent: "bg-red-500",
    bg: "bg-[var(--surface)] border-red-500/25",
    iconBg: "bg-red-500/15 text-red-400",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastInternal;
  onDismiss: (id: number) => void;
}) {
  const v = variantStyles[toast.variant ?? "default"];
  const isClickable = !!(toast.onAction && toast.actionLabel);
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "toast-card flex overflow-hidden rounded-2xl border transition-all duration-200",
        "border-[var(--toast-border)] bg-[var(--toast-bg)] shadow-[var(--toast-shadow)]",
        isClickable && "cursor-pointer",
        "toast-enter"
      )}
      onClick={isClickable ? (e) => { if (!(e.target as HTMLElement).closest("button[aria-label='Dismiss']")) toast.onAction?.(); } : undefined}
    >
      <div className={cn("w-1 shrink-0", v.accent)} aria-hidden />
      <div className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", v.iconBg)}>
          {v.icon}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="font-medium font-heading text-[var(--text)] text-sm">
            {toast.title}
          </p>
          {toast.message && (
            <p className="mt-0.5 text-xs text-[var(--muted-2)] leading-snug">
              {toast.message}
            </p>
          )}
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              className="mt-2 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-amber-500/15 hover:text-amber-400 transition-colors"
              onClick={(e) => { e.stopPropagation(); toast.onAction?.(); }}
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
          className="shrink-0 rounded-lg p-1.5 text-[var(--muted-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastInternal[]>([]);

  const showToast = useCallback((options: ToastOptions) => {
    const id = Date.now();
    setToasts((current) => [...current, { id, ...options }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex w-full max-w-md flex-col gap-3 pointer-events-none">
        <div className="flex flex-col gap-3 pointer-events-auto">
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
