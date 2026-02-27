import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const baseClasses =
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg)] disabled:opacity-60 disabled:cursor-not-allowed";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--primary)] text-white shadow-sm hover:bg-[var(--primary-hover)]",
  secondary:
    "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--text)]",
  ghost:
    "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
  destructive:
    "bg-[var(--danger)] text-white hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", leftIcon, rightIcon, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {leftIcon && <span className="mr-2 inline-flex">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="ml-2 inline-flex">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

