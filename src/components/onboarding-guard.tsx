"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/app-store";

export function OnboardingGuard({ children }: { children: ReactNode }) {
  const { ready, state } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (ready && !state.onboardingComplete) router.replace("/onboarding");
  }, [ready, router, state.onboardingComplete]);

  if (!ready || !state.onboardingComplete) {
    return (
      <div className="grid min-h-[60vh] place-items-center" aria-live="polite">
        <p className="text-sm text-[var(--text-muted)]">Dein Kompass richtet sich aus.</p>
      </div>
    );
  }
  return children;
}
