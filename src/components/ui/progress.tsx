import { cn } from "./class-names";

export interface ProgressProps {
  value: number;
  max?: number;
  label: string;
  showValue?: boolean;
  className?: string;
}

export function Progress({
  value,
  max = 100,
  label,
  showValue = false,
  className,
}: ProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const safeValue = Math.min(Math.max(value, 0), safeMax);
  const percentage = Math.round((safeValue / safeMax) * 100);

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className={showValue ? "font-medium text-ink-soft" : "sr-only"}>
          {label}
        </span>
        {showValue ? (
          <span className="tabular-nums text-muted" aria-hidden="true">
            {percentage}%
          </span>
        ) : null}
      </div>
      <progress
        className="ic-progress"
        value={safeValue}
        max={safeMax}
        aria-label={label}
      >
        {percentage}%
      </progress>
    </div>
  );
}
