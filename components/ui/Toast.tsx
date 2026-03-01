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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastInternal[]>([]);

  const showToast = useCallback((options: ToastOptions) => {
    const id = Date.now();
    setToasts((current) => [...current, { id, ...options }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 text-xs">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "rounded-xl border px-3 py-2 shadow-lg bg-[var(--surface)] border-[var(--border)] text-[var(--text)]",
              toast.variant === "success" && "border-emerald-500/30",
              toast.variant === "warning" && "border-amber-500/30",
              toast.variant === "danger" && "border-red-500/30"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold">{toast.title}</p>
                {toast.message && (
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    {toast.message}
                  </p>
                )}
              </div>
              {toast.actionLabel && toast.onAction && (
                <button
                  type="button"
                  className="rounded-lg bg-[var(--surface-2)] px-2 py-1 text-[10px] font-medium text-[var(--text)] hover:bg-amber-500/10 transition-colors"
                  onClick={toast.onAction}
                >
                  {toast.actionLabel}
                </button>
              )}
            </div>
          </div>
        ))}
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
