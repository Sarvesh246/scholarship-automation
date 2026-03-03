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
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-[var(--bg)] disabled:opacity-60 disabled:cursor-not-allowed";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-linear-to-r from-amber-600 to-amber-500 text-[var(--on-primary)] shadow-sm hover:shadow-[0_10px_30px_rgba(217,119,6,0.3)] hover:-translate-y-0.5",
  secondary:
    "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-amber-500/50 hover:bg-amber-500/5",
  ghost:
    "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]",
  destructive:
    "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
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
