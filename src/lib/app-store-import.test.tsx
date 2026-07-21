import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { appStateToDataStore } from "./app-state-adapter";
import {
  useAppStore,
  type AppState,
} from "./app-store";
import { createDataExport, serializeDataExport } from "./data-transfer";
import { makeAppState, renderWithAppStore } from "@/test/render-app";

const CURRENT_IDENTITY = {
  statement: "Ich halte meine aktuellen Zusagen.",
  startedAt: "2026-07-01T08:00:00.000Z",
  rehearsalDates: ["2026-07-20"],
};

function MergeImportProbe({ backup }: { backup: string }) {
  const { state, previewImport, applyImport } = useAppStore();

  return (
    <>
      <button type="button" onClick={() => applyImport(previewImport(backup), "merge")}>
        Zusammenführen
      </button>
      <output aria-label="Identität">{state.settings.identity?.statement ?? "Keine"}</output>
      <output aria-label="Bewegungsarten">{state.settings.movementCategories.join("|")}</output>
    </>
  );
}

function RetentionProbe() {
  const { state, updateSettings, savePlan } = useAppStore();
  const identity = state.settings.identity;

  const addLatestEntries = () => {
    if (identity) {
      updateSettings({
        identity: {
          ...identity,
          rehearsalDates: [...identity.rehearsalDates, "2027-01-01"],
        },
      });
    }
    savePlan({
      date: "2026-07-21",
      mainTask: { id: "primary", title: "Testaufgabe", completed: false },
      nextStep: "Beginnen",
      secondaryTasks: [],
      bodyActivity: "Neueste Bewegung",
      bodyCompleted: false,
      meditationSkipped: true,
      meditationCompleted: false,
      courageousCompleted: false,
    });
  };

  return (
    <>
      <button type="button" onClick={addLatestEntries}>Neueste ergänzen</button>
      <output aria-label="Bewegungs-Retention">
        {`${state.settings.movementCategories.length}|${state.settings.movementCategories.at(0)}|${state.settings.movementCategories.at(-1)}`}
      </output>
      <output aria-label="Proben-Retention">
        {`${identity?.rehearsalDates.length ?? 0}|${identity?.rehearsalDates.at(0) ?? ""}|${identity?.rehearsalDates.at(-1) ?? ""}`}
      </output>
    </>
  );
}

function currentState(overrides: Partial<AppState> = {}): AppState {
  return makeAppState({
    updatedAt: "2026-07-21T12:00:00.000Z",
    ...overrides,
    settings: {
      ...makeAppState().settings,
      movementCategories: ["Muay Thai", "Eigene aktuelle Bewegung"],
      identity: CURRENT_IDENTITY,
      ...(overrides.settings ?? {}),
    },
  });
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe("Produktions-Import im AppStore", () => {
  it("bewahrt neue optionale Einstellungen vor einem älteren Legacy-Merge", async () => {
    const legacyBackup = JSON.stringify({
      format: "inner-compass",
      exportVersion: 1,
      schemaVersion: 1,
      exportedAt: "2025-01-02T08:00:00.000Z",
      timeZone: "Europe/Zurich",
      data: {
        appSettings: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            createdAt: "2025-01-01T08:00:00.000Z",
            updatedAt: "2025-01-02T08:00:00.000Z",
            timezone: "Europe/Zurich",
            schemaVersion: 1,
            displayName: "Alter Import",
          },
        ],
      },
    });
    const user = userEvent.setup();
    await renderWithAppStore(<MergeImportProbe backup={legacyBackup} />, currentState());

    await user.click(screen.getByRole("button", { name: "Zusammenführen" }));

    expect(screen.getByLabelText("Identität")).toHaveTextContent(CURRENT_IDENTITY.statement);
    expect(screen.getByLabelText("Bewegungsarten")).toHaveTextContent(
      "Muay Thai|Eigene aktuelle Bewegung",
    );
  });

  it("übernimmt Settings nur dann, wenn deren updatedAt tatsächlich neuer ist", async () => {
    const incoming = currentState({
      updatedAt: "2026-08-01T12:00:00.000Z",
      settings: {
        ...currentState().settings,
        movementCategories: ["Neue Bewegung"],
        identity: {
          statement: "Ich richte mich an der neueren Sicherung aus.",
          startedAt: "2026-08-01T08:00:00.000Z",
          rehearsalDates: [],
        },
      },
    });
    const backup = serializeDataExport(
      createDataExport(appStateToDataStore(incoming), {
        now: new Date("2026-08-01T12:00:00.000Z"),
      }),
    );
    const user = userEvent.setup();
    await renderWithAppStore(<MergeImportProbe backup={backup} />, currentState());

    await user.click(screen.getByRole("button", { name: "Zusammenführen" }));

    expect(screen.getByLabelText("Identität")).toHaveTextContent(
      "Ich richte mich an der neueren Sicherung aus.",
    );
    expect(screen.getByLabelText("Bewegungsarten")).toHaveTextContent("Neue Bewegung");
  });

  it("behält beim Ergänzen voller Listen den jeweils neuesten Eintrag", async () => {
    const movementCategories = Array.from(
      { length: 30 },
      (_, index) => `Bewegung ${String(index + 1).padStart(2, "0")}`,
    );
    const rehearsalDates = Array.from({ length: 366 }, (_, index) => {
      const date = new Date(Date.UTC(2025, 0, index + 1));
      return date.toISOString().slice(0, 10);
    });
    const state = currentState({
      settings: {
        ...currentState().settings,
        movementCategories,
        identity: { ...CURRENT_IDENTITY, rehearsalDates },
      },
    });
    const user = userEvent.setup();
    await renderWithAppStore(<RetentionProbe />, state);

    await user.click(screen.getByRole("button", { name: "Neueste ergänzen" }));

    expect(screen.getByLabelText("Bewegungs-Retention")).toHaveTextContent(
      "30|Bewegung 02|Neueste Bewegung",
    );
    expect(screen.getByLabelText("Proben-Retention")).toHaveTextContent(
      `366|${rehearsalDates[1]}|2027-01-01`,
    );
  });
});
