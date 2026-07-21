import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "./class-names";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const baseClassName =
  "inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 rounded-control border font-semibold tracking-[-0.01em] transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45";

const variantClassNames: Record<ButtonVariant, string> = {
  primary:
    "border-accent bg-accent text-on-accent shadow-sm hover:border-accent-hover hover:bg-accent-hover",
  secondary:
    "border-line-strong bg-surface-raised text-ink shadow-sm hover:border-accent-muted hover:bg-accent-soft",
  ghost:
    "border-transparent bg-transparent text-ink-soft hover:bg-surface-muted hover:text-ink",
  danger:
    "border-danger bg-danger text-on-danger shadow-sm hover:border-danger-hover hover:bg-danger-hover",
};

const sizeClassNames: Record<ButtonSize, string> = {
  sm: "min-h-10 px-3.5 py-2 text-sm",
  md: "min-h-12 px-5 py-2.5 text-[0.95rem]",
  lg: "min-h-14 px-6 py-3 text-base",
  icon: "size-12 p-0",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return cn(
    baseClassName,
    variantClassNames[variant],
    sizeClassNames[size],
    fullWidth && "w-full",
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    fullWidth = false,
    isLoading = false,
    loadingLabel = "Wird geladen",
    className,
    children,
    disabled,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClassName({ variant, size, fullWidth, className })}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <>
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
          />
          <span>{loadingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
});
