"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ComponentType, type ReactNode } from "react";

import {
  CompassMarkIcon,
  FocusIcon,
  ReflectionIcon,
  ResetIcon,
  SettingsIcon,
  TodayIcon,
  type IconProps,
} from "@/components/ui/icons";
import { cn } from "@/components/ui/class-names";
import { useAppStore } from "@/lib/app-store";

interface NavigationItem {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
}

const navigationItems: readonly NavigationItem[] = [
  { href: "/today", label: "Heute", icon: TodayIcon },
  { href: "/focus", label: "Fokus", icon: FocusIcon },
  { href: "/reset", label: "Reset", icon: ResetIcon },
  { href: "/reflection", label: "Reflexion", icon: ReflectionIcon },
  { href: "/settings", label: "Einstellungen", icon: SettingsIcon },
];

const immersivePathPatterns = [
  /^\/onboarding(?:\/|$)/,
  /^\/focus\/(?:active|session)(?:\/|$)/,
  /^\/meditation\/(?:active|session)(?:\/|$)/,
];

export interface AppShellProps {
  children: ReactNode;
  hideNavigation?: boolean;
}

function isNavigationItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLink({
  item,
  compact = false,
  pathname,
}: {
  item: NavigationItem;
  compact?: boolean;
  pathname: string;
}) {
  const active = isNavigationItemActive(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex min-h-12 items-center rounded-control text-sm font-semibold no-underline transition-[background-color,color] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus",
        compact
          ? "min-w-0 flex-col justify-center gap-1 rounded-xl px-1 py-1.5 text-[clamp(0.56rem,2.55vw,0.68rem)] leading-none tracking-[-0.01em]"
          : "gap-3 px-3.5 py-2.5",
        active
          ? "bg-accent-soft text-accent"
          : "text-muted hover:bg-surface-muted hover:text-ink",
      )}
    >
      <Icon
        className={cn(
          "shrink-0 transition-transform group-active:scale-95",
          compact ? "size-[1.35rem]" : "size-5",
        )}
      />
      <span className={compact ? "max-w-full" : undefined}>{item.label}</span>
      {!compact && active ? (
        <span
          aria-hidden="true"
          className="absolute top-1/2 -left-1 h-5 w-0.5 -translate-y-1/2 rounded-full bg-accent"
        />
      ) : null}
    </Link>
  );
}

export function AppShell({ children, hideNavigation = false }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeFocus, activeMeditation } = useAppStore();
  const immersiveRoute = immersivePathPatterns.some((pattern) =>
    pattern.test(pathname),
  );
  const immersiveSession =
    activeFocus?.status === "running" ||
    activeFocus?.status === "paused" ||
    activeFocus?.status === "review" ||
    activeMeditation?.status === "running" ||
    activeMeditation?.status === "paused" ||
    activeMeditation?.status === "review";
  const navigationHidden = hideNavigation || immersiveRoute || immersiveSession;

  useEffect(() => {
    if (activeFocus && ["running", "paused", "review"].includes(activeFocus.status) && pathname !== "/focus") {
      router.replace("/focus");
      return;
    }
    if (activeMeditation && ["running", "paused", "review"].includes(activeMeditation.status) && pathname !== "/meditation") {
      router.replace("/meditation");
    }
  }, [activeFocus, activeMeditation, pathname, router]);

  return (
    <div
      className={cn(
        "min-h-dvh",
        !navigationHidden && "lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]",
      )}
    >
      <a href="#main-content" className="skip-link">
        Zum Inhalt springen
      </a>

      {!navigationHidden ? (
        <aside className="sticky top-0 hidden h-dvh border-r border-line bg-surface/75 px-5 py-7 backdrop-blur-xl lg:flex lg:flex-col">
          <Link
            href="/today"
            className="flex items-center gap-3 rounded-control px-2 py-1 text-ink no-underline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus"
            aria-label="Inner Compass – Heute"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
              <CompassMarkIcon className="size-6" />
            </span>
            <span>
              <span className="block font-display text-lg font-semibold tracking-[-0.025em]">
                Inner Compass
              </span>
              <span className="block text-[0.68rem] font-semibold tracking-[0.09em] text-muted uppercase">
                Nur der nächste Schritt
              </span>
            </span>
          </Link>

          <nav aria-label="Hauptnavigation" className="mt-10 grid gap-1.5">
            {navigationItems.map((item) => (
              <NavigationLink key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>

          <p className="mt-auto mb-0 border-t border-line px-2 pt-5 text-xs leading-5 text-muted">
            Deine Einträge bleiben auf diesem Gerät.
          </p>
        </aside>
      ) : null}

      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          "min-w-0",
          navigationHidden
            ? "min-h-dvh"
            : "px-4 pt-7 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-7 sm:pt-10 lg:px-10 lg:pt-12 lg:pb-14",
        )}
      >
        {children}
      </main>

      {!navigationHidden ? (
        <nav
          aria-label="Hauptnavigation"
          className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-1.5 pt-1.5 shadow-[0_-10px_32px_rgb(var(--ic-shadow-color)/0.08)] backdrop-blur-xl lg:hidden"
        >
          <div className="grid grid-cols-5 gap-0.5">
            {navigationItems.map((item) => (
              <NavigationLink
                key={item.href}
                item={item}
                pathname={pathname}
                compact
              />
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
