import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "./class-names";

export type CardVariant = "default" | "muted" | "outlined" | "accent";
export type CardPadding = "none" | "sm" | "md" | "lg";

const variantClassNames: Record<CardVariant, string> = {
  default: "border-line bg-surface shadow-card",
  muted: "border-transparent bg-surface-muted",
  outlined: "border-line-strong bg-transparent",
  accent: "border-accent-muted bg-accent-soft",
};

const paddingClassNames: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    variant = "default",
    padding = "md",
    className,
    children,
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-card border",
        variantClassNames[variant],
        paddingClassNames[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mb-5 flex items-start justify-between gap-4", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "m-0 text-lg font-semibold tracking-[-0.02em] text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-1 mb-0 text-sm text-muted", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-w-0", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-6 flex flex-wrap items-center gap-3", className)}
      {...props}
    />
  );
}
