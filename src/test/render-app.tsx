import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import {
  AppStoreProvider,
  emptyState,
  useAppStore,
  type AppState,
} from "@/lib/app-store";

const fallbackKey = "inner-compass:fallback:v1";

export function makeAppState(overrides: Partial<AppState> = {}): AppState {
  const base = emptyState();

  return {
    ...base,
    onboardingComplete: true,
    ...overrides,
    settings: {
      ...base.settings,
      ...(overrides.settings ?? {}),
    },
  };
}

function ReadyGate({ children }: { children: ReactNode }) {
  const { ready } = useAppStore();

  if (!ready) return <span>Testdaten werden geladen</span>;

  return (
    <>
      <span data-testid="app-store-ready" hidden />
      {children}
    </>
  );
}

export async function renderWithAppStore(
  page: ReactElement,
  state: AppState = makeAppState(),
) {
  window.localStorage.setItem(fallbackKey, JSON.stringify(state));
  const view = render(
    <AppStoreProvider>
      <ReadyGate>{page}</ReadyGate>
    </AppStoreProvider>,
  );

  await screen.findByTestId("app-store-ready");
  return view;
}
