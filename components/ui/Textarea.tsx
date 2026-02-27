import { forwardRef, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, className, id, ...props }, ref) => {
    const textareaId = id || props.name;
    return (
      <div className="space-y-1.5 text-sm">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-medium text-[var(--muted)]"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            "min-h-[120px] w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] shadow-sm placeholder:text-[var(--muted-2)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg)]",
            className
          )}
          {...props}
        />
        {hint && (
          <p className="text-xs text-[var(--muted-2)]">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

