import type { PropsWithChildren, SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  title?: string;
}

function IconFrame({
  title,
  children,
  ...props
}: PropsWithChildren<IconProps>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function CompassMarkIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.8 8.2-2.1 5.5-5.5 2.1 2.1-5.5 5.5-2.1Z" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </IconFrame>
  );
}

export function TodayIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.8 4.8l1.4 1.4M17.8 17.8l1.4 1.4M2.5 12h2M19.5 12h2M4.8 19.2l1.4-1.4M17.8 6.2l1.4-1.4" />
    </IconFrame>
  );
}

export function FocusIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </IconFrame>
  );
}

export function ResetIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M5.2 7.4A8 8 0 1 1 4 13.6" />
      <path d="M4.8 3.9v3.8h3.8" />
      <path d="M9.2 12h5.6M12 9.2V15" />
    </IconFrame>
  );
}

export function ReflectionIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M4.5 4.5h5A2.5 2.5 0 0 1 12 7v13a3 3 0 0 0-3-3H4.5V4.5Z" />
      <path d="M19.5 4.5h-5A2.5 2.5 0 0 0 12 7v13a3 3 0 0 1 3-3h4.5V4.5Z" />
    </IconFrame>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M4 6h10M18 6h2M4 12h3M11 12h9M4 18h8M16 18h4" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="14" cy="18" r="2" />
    </IconFrame>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="m7 9.5 5 5 5-5" />
    </IconFrame>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="m7 7 10 10M17 7 7 17" />
    </IconFrame>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="m5 12.5 4.2 4.2L19 7" />
    </IconFrame>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M4 12h15M14 7l5 5-5 5" />
    </IconFrame>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="m9 7 8 5-8 5V7Z" />
    </IconFrame>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M9 7v10M15 7v10" />
    </IconFrame>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </IconFrame>
  );
}
