import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { IdentityCompass } from "./identity-compass";
import { localDateKey, useAppStore } from "@/lib/app-store";
import { makeAppState, renderWithAppStore } from "@/test/render-app";

function IdentityStateProbe() {
  const { state } = useAppStore();
  return <output aria-label="Gespeicherte Identität">{JSON.stringify(state.settings.identity)}</output>;
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("Identitäts-Kompass", () => {
  it("richtet eine glaubwürdige Identität ohne zusätzlichen Tagesflow ein", async () => {
    const user = userEvent.setup();
    await renderWithAppStore(<IdentityCompass variant="compact" />);

    await user.click(screen.getByRole("button", { name: "Ausrichtung festlegen" }));
    await user.click(screen.getByRole("button", {
      name: "Ich kehre ruhig zurück, wenn ich abdrifte.",
    }));
    await user.type(
      screen.getByRole("textbox", { name: "Wenn es schwer wird" }),
      "Ich benenne den kleinsten Wiedereinstieg.",
    );
    await user.click(screen.getByRole("button", { name: "Ausrichtung speichern" }));

    expect(screen.getByRole("heading", {
      name: "Ich kehre ruhig zurück, wenn ich abdrifte.",
    })).toBeInTheDocument();
    expect(screen.getByText(/21-Tage-Experiment/)).toBeInTheDocument();
    expect(screen.getByText(/Keine Streak/)).toBeInTheDocument();
  });

  it("speichert eine optionale Neurahmung, ohne die vier Prüffragen abzufragen", async () => {
    const user = userEvent.setup();
    const state = makeAppState({
      settings: {
        ...makeAppState().settings,
        identity: {
          statement: "Ich beginne klein und kehre ruhig zurück.",
          startedAt: new Date().toISOString(),
          rehearsalDates: [],
        },
      },
    });
    await renderWithAppStore(
      <>
        <IdentityCompass variant="full" />
        <IdentityStateProbe />
      </>,
      state,
    );

    await user.click(screen.getByRole("button", { name: "Satz prüfen" }));
    const dialog = screen.getByRole("dialog", { name: "Einen Satz ruhig prüfen" });
    expect(within(dialog).getByText("Vier Prüffragen")).toBeInTheDocument();
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(4);
    await user.type(
      screen.getByRole("textbox", { name: "Alte Geschichte" }),
      "Ich breche immer ab.",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Glaubwürdige Neurahmung" }),
      "Abbrechen war eine Erfahrung; heute beginne ich erneut.",
    );
    await user.click(screen.getByRole("button", { name: "Neurahmung speichern" }));

    expect(screen.getByText(/Abbrechen war eine Erfahrung/, { selector: "blockquote" })).toBeInTheDocument();
    expect(screen.getByLabelText("Gespeicherte Identität")).not.toHaveTextContent(
      "Ich breche immer ab.",
    );
  });

  it("markiert eine Ausrichtungsmeditation im 21-Tage-Kalender als Probe", async () => {
    const now = new Date();
    const startedAt = new Date(now.getTime() - 60_000).toISOString();
    const endedAt = now.toISOString();
    const state = makeAppState({
      settings: {
        ...makeAppState().settings,
        identity: {
          statement: "Ich kehre ruhig zurück.",
          startedAt,
          rehearsalDates: [],
        },
      },
      meditationSessions: [{
        id: "10000000-0000-4000-8000-000000000099",
        durationMinutes: 3,
        focus: "Ausrichtung",
        startedAt,
        plannedEndAt: endedAt,
        totalPausedMs: 0,
        endedAt,
        status: "completed",
        createdAt: startedAt,
        updatedAt: endedAt,
        schemaVersion: 2,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      }],
    });

    await renderWithAppStore(<IdentityCompass variant="full" />, state);

    expect(screen.getByRole("listitem", {
      name: new RegExp(`${localDateKey(now).split("-").at(-1)}.*Probe notiert`),
    })).toBeInTheDocument();
  });
});
