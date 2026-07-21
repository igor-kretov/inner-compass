import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { OnboardingGuard } from "@/components/onboarding-guard";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingGuard>
      <AppShell>{children}</AppShell>
    </OnboardingGuard>
  );
}
