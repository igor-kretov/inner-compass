import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { ChevronDownIcon } from "./icons";
import { cn } from "./class-names";

type FieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "false" | "true";
};

export interface FieldProps {
  label: ReactNode;
  children: ReactElement<FieldControlProps>;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  className?: string;
}

export function Field({
  label,
  children,
  htmlFor,
  hint,
  error,
  optional = false,
  className,
}: FieldProps) {
  const generatedId = useId();
  const controlId = htmlFor ?? children.props.id ?? `field-${generatedId}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [
    children.props["aria-describedby"],
    hintId,
    errorId,
  ]
    .filter(Boolean)
    .join(" ");

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: controlId,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : children.props["aria-invalid"],
      })
    : children;

  return (
    <div className={cn("grid min-w-0 gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={controlId}
          className="text-sm font-semibold leading-5 text-ink"
        >
          {label}
        </label>
        {optional ? (
          <span className="text-xs text-faint">Optional</span>
        ) : null}
      </div>
      {control}
      {hint ? (
        <p id={hintId} className="m-0 text-sm leading-5 text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="m-0 text-sm font-medium leading-5 text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

const controlClassName =
  "block min-h-12 min-w-0 max-w-full w-full rounded-control border border-line-strong bg-surface-raised px-4 py-2.5 text-base text-ink shadow-sm transition-[border-color,box-shadow,background-color] placeholder:text-faint hover:border-accent-muted focus:border-accent focus:outline-3 focus:outline-offset-2 focus:outline-focus disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted disabled:opacity-70 aria-invalid:border-danger aria-invalid:focus:outline-danger";

export type TextInputProps = InputHTMLAttributes<HTMLInputElement>;

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ className, type = "text", ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(controlClassName, className)}
        {...props}
      />
    );
  },
);

export interface TextAreaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  resize?: "none" | "vertical";
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(
    { className, resize = "vertical", rows = 4, ...props },
    ref,
  ) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          controlClassName,
          "min-h-28",
          resize === "none" ? "resize-none" : "resize-y",
          className,
        )}
        {...props}
      />
    );
  },
);

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <span className="relative block min-w-0 max-w-full">
      <select
        ref={ref}
        className={cn(
          controlClassName,
          "cursor-pointer appearance-none pr-11",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3.5 size-5 -translate-y-1/2 text-muted"
      />
    </span>
  );
});
