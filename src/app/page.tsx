"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/app-store";

export default function HomePage() {
  const { ready, state } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    router.replace(state.onboardingComplete ? "/today" : "/onboarding");
  }, [ready, router, state.onboardingComplete]);

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="text-center" aria-live="polite">
        <span className="mx-auto mb-4 block size-3 animate-pulse rounded-full bg-[var(--accent)]" />
        <p className="text-sm text-[var(--text-muted)]">Inner Compass wird bereit.</p>
      </div>
    </main>
  );
}
