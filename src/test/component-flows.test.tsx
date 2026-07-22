import { act, cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import FocusPage from "@/app/(main)/focus/page";
import MeditationPage from "@/app/(main)/meditation/page";
import ReflectionPage from "@/app/(main)/reflection/page";
import ResetPage from "@/app/(main)/reset/page";
import SettingsPage from "@/app/(main)/settings/page";
import TodayPage from "@/app/(main)/today/page";
import { appStateToDataStore } from "@/lib/app-state-adapter";
import {
  localDateKey,
  shiftLocalDate,
  type AppState,
  type DailyPlan,
} from "@/lib/app-store";
import { createDataExport, serializeDataExport } from "@/lib/data-transfer";
import { formatPlanDate, SIMPLE_DAY_PLAN_TEMPLATE } from "@/lib/simple-day-plan";
import { makeAppState, renderWithAppStore } from "@/test/render-app";

const navigation = vi.hoisted(() => ({
  pathname: "/today",
  search: "",
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push, replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

function plannedState(overrides: Partial<AppState> = {}) {
  const timestamp = "2026-07-20T08:00:00.000Z";
  const plan: DailyPlan = {
    id: "11111111-1111-4111-8111-111111111111",
    date: localDateKey(),
    mainTask: {
      id: "22222222-2222-4222-8222-222222222222",
      title: "Angebot fertigstellen",
      completed: false,
    },
    nextStep: "Dokument öffnen",
    secondaryTasks: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        title: "Rückruf erledigen",
        completed: false,
      },
    ],
    bodyActivity: "Spaziergang",
    bodyCompleted: false,
    meditationMinutes: 10,
    meditationSkipped: false,
    meditationCompleted: false,
    courageousAction: "Schwierige Nachricht senden",
    courageousCompleted: false,
    startTime: "09:30",
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion: 1,
  };

  return makeAppState({ plans: [plan], ...overrides });
}

const TEST_IDENTITY = {
  statement: "Ich halte meine Standards ruhig und kehre nach Unterbrechungen zurück.",
  action: "Den kleinsten sichtbaren Schritt beginnen",
  startedAt: "2026-07-20T18:00:00.000Z",
  rehearsalDates: [],
};

function withIdentity(state: AppState = makeAppState()): AppState {
  return {
    ...state,
    settings: {
      ...state.settings,
      identity: TEST_IDENTITY,
    },
  };
}

function ResetPlannerHarness() {
  const [showPlanner, setShowPlanner] = useState(false);
  return showPlanner ? (
    <TodayPage />
  ) : (
    <>
      <ResetPage />
      <button type="button" onClick={() => setShowPlanner(true)}>
        Tagesplan öffnen
      </button>
    </>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  navigation.pathname = "/today";
  navigation.search = "";
  navigation.push.mockReset();
  navigation.replace.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("Einfacher Block-Tagesplan", () => {
  it("bereitet den gewählten Tag aus der Vorlage vor und zeigt nur die sechs Blöcke", async () => {
    const user = userEvent.setup();
    await renderWithAppStore(<TodayPage />);

    const now = new Date();
    const expectedDate = now.getHours() >= 17
      ? shiftLocalDate(localDateKey(now), 1)
      : localDateKey(now);
    expect(
      screen.getByRole("heading", { name: `Plan für ${formatPlanDate(expectedDate)}` }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tag aus Vorlage vorbereiten" }));

    for (const block of SIMPLE_DAY_PLAN_TEMPLATE) {
      expect(screen.getByRole("heading", { name: block.title })).toBeInTheDocument();
    }
    expect(screen.getByText("kein Handy bis fertig")).toBeInTheDocument();
    expect(screen.getByText(/Pay attention how often/)).toBeInTheDocument();
    expect(screen.getByText("Was ist heute nützlich und sauber? (Fokus)")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /Hauptaufgabe|Nebenaufgabe|Bewegungsart/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Planerbereiche" })).not.toBeInTheDocument();
  });

  it("ergänzt und hakt einen Checklistenpunkt direkt im gewählten Block ab", async () => {
    const user = userEvent.setup();
    await renderWithAppStore(<TodayPage />);
    await user.click(screen.getByRole("button", { name: "Tag aus Vorlage vorbereiten" }));

    await user.click(
      screen.getByRole("button", { name: "Aufgabe zu Business Block hinzufügen" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Neue Aufgabe in Business Block" }),
      "Kundin anrufen",
    );
    await user.click(screen.getByRole("button", { name: "Hinzufügen" }));

    const task = screen.getByRole("checkbox", { name: /Kundin anrufen.*abhaken/ });
    expect(task).not.toBeChecked();
    await user.click(task);
    expect(task).toBeChecked();
    expect(task).toHaveAccessibleName(/Kundin anrufen.*wieder öffnen/);
    expect(screen.queryByText(/Punkte|Streak|versagt/i)).not.toBeInTheDocument();
  });

  it("wechselt um 17 Uhr automatisch auf morgen, aber respektiert danach die eigene Auswahl", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(new Date(2026, 6, 21, 16, 59, 30));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await renderWithAppStore(<TodayPage />);

    expect(screen.getByRole("heading", { name: "Plan für 21.07.2026" })).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(screen.getByRole("heading", { name: "Plan für 22.07.2026" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Heute" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(screen.getByRole("heading", { name: "Plan für 21.07.2026" })).toBeInTheDocument();
  });

  it("folgt nach einer längeren Pause dem neuen Kalendertag, solange kein Datum gewählt wurde", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(new Date(2026, 6, 21, 16, 0, 0));
    await renderWithAppStore(<TodayPage />);
    expect(screen.getByRole("heading", { name: "Plan für 21.07.2026" })).toBeInTheDocument();

    act(() => {
      vi.setSystemTime(new Date(2026, 6, 22, 10, 0, 0));
      window.dispatchEvent(new Event("focus"));
    });
    expect(screen.getByRole("heading", { name: "Plan für 22.07.2026" })).toBeInTheDocument();
  });
});

describe("Starthelfer und Fokusabschluss", () => {
  it("führt den Starthelfer bis in einen direkten 10-Minuten-Block", async () => {
    navigation.pathname = "/focus";
    navigation.search = "helper=1";
    const user = userEvent.setup();
    await renderWithAppStore(<FocusPage />);

    await user.type(screen.getByRole("textbox", { name: "Aufgabe" }), "Steuerbelege sortieren");
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await user.click(screen.getByRole("radio", { name: "Aufgabe ist langweilig" }));
    await user.click(screen.getByRole("button", { name: "Weiter" }));

    expect(screen.getByText("Du brauchst keine Lust. Du brauchst einen Anfang.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await user.type(
      screen.getByRole("textbox", { name: /Welchen zehnminütigen Einstieg/ }),
      "Den ersten Umschlag öffnen",
    );
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await user.click(screen.getByRole("button", { name: "10-Minuten-Start beginnen" }));

    expect(screen.getByRole("timer")).toHaveTextContent("10:00");
    expect(screen.getByRole("button", { name: "Block beenden" })).toBeInTheDocument();
  });

  it("beendet einen Block sofort, erfasst das Ergebnis und zeigt ihn im Verlauf", async () => {
    navigation.pathname = "/focus";
    navigation.search = "task=22222222-2222-4222-8222-222222222222";
    const user = userEvent.setup();
    await renderWithAppStore(<FocusPage />, plannedState());

    await user.click(screen.getByRole("radio", { name: "10 Min Einstieg" }));
    await user.click(screen.getByRole("button", { name: "Fokus beginnen" }));
    await user.click(screen.getByRole("button", { name: "Block beenden" }));

    expect(
      screen.getByRole("heading", { name: "Prüfe das Ergebnis, nicht dein Gefühl." }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Ja" }));
    await user.type(
      screen.getByRole("textbox", { name: /nächste klare Schritt/ }),
      "An Kundin senden",
    );
    await user.click(screen.getByRole("button", { name: "Abschluss speichern" }));

    const history = screen.getByRole("heading", { name: "Letzte Fokusblöcke" }).closest("section");
    expect(history).not.toBeNull();
    expect(within(history as HTMLElement).getByText("Angebot fertigstellen")).toBeInTheDocument();
    expect(within(history as HTMLElement).getByText(/Erreicht/)).toBeInTheDocument();
  });

  it("richtet den Fokusblock an der Identität aus und speichert wertfreie Belege", async () => {
    navigation.pathname = "/focus";
    navigation.search = "task=22222222-2222-4222-8222-222222222222";
    const user = userEvent.setup();
    await renderWithAppStore(<FocusPage />, withIdentity(plannedState()));

    expect(screen.getByText(
      `Für diesen Block handelst du so: ${TEST_IDENTITY.statement}`,
    )).toBeInTheDocument();
    expect(screen.getByText(
      "Ausatmen, Schultern lösen, ersten Schritt sehen.",
    )).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "10 Min Einstieg" }));
    await user.click(screen.getByRole("button", { name: "Fokus beginnen" }));
    expect(screen.getByText(
      `Für diesen Block handelst du so: ${TEST_IDENTITY.statement}`,
    )).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ich bin abgedriftet" }));
    expect(screen.getByRole("heading", { name: "Zurückkehren ist die Übung" })).toBeInTheDocument();
    expect(screen.getByText(/korrigierst den Kurs und kehrst ruhig/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Schließen" }));
    await user.click(screen.getByRole("button", { name: "Block beenden" }));

    await user.click(screen.getByRole("radio", { name: "Ja" }));
    expect(screen.getByText(/das gewählte Ergebnis erreicht/)).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Teilweise" }));
    expect(screen.getByText(/einen realen Zwischenstand geschaffen/)).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Nein" }));
    expect(screen.getByText(/kannst den nächsten Schritt neu wählen/)).toBeInTheDocument();
  });
});

describe("Reset-Flow", () => {
  it("speichert eine Rückkehr ohne nötige Handlung und ohne Timer-Wartezeit", async () => {
    navigation.pathname = "/reset";
    const user = userEvent.setup();
    await renderWithAppStore(<ResetPage />);

    await user.click(screen.getByRole("button", { name: "Reset beginnen" }));
    await user.type(screen.getByRole("textbox", { name: "Kurz benennen" }), "Ich drehe mich im Kreis");
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await user.click(screen.getByRole("radio", { name: "Eine Emotion" }));
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await user.click(screen.getByRole("radio", { name: "Nein" }));
    await user.click(screen.getByRole("radio", { name: "Nicht erneut einplanen" }));
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await user.click(screen.getByRole("radio", { name: "Wasser trinken" }));
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await user.click(screen.getByRole("radio", { name: "Erholung" }));
    await user.click(screen.getByRole("button", { name: "Zurück ins Leben" }));

    expect(screen.getByRole("heading", { name: "Du musst den Gedanken nicht besiegen." })).toBeInTheDocument();
    expect(screen.getByText(/Du kehrst jetzt zurück zu:/)).toHaveTextContent("Erholung");
  });

  it("unterbricht den Flow bei einer eindeutigen Krisenformulierung", async () => {
    navigation.pathname = "/reset";
    const user = userEvent.setup();
    await renderWithAppStore(<ResetPage />);

    await user.click(screen.getByRole("button", { name: "Reset beginnen" }));
    await user.type(screen.getByRole("textbox", { name: "Kurz benennen" }), "Ich will nicht mehr leben");

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Diese App kann dich in einer akuten Krise nicht ausreichend unterstützen.",
    );
    expect(screen.getByRole("button", { name: "Weiter" })).toBeDisabled();
  });

  it("legt eine verantwortliche Handlung auch in einem vollen alten Tageskern sichtbar ab", async () => {
    navigation.pathname = "/reset";
    const state = plannedState();
    state.plans[0].secondaryTasks.push({
      id: "44444444-4444-4444-8444-444444444444",
      title: "Zweiter alter Nebenpunkt",
      completed: false,
    });
    const user = userEvent.setup();
    await renderWithAppStore(<ResetPlannerHarness />, state);

    await user.click(screen.getByRole("button", { name: "Reset beginnen" }));
    await user.type(screen.getByRole("textbox", { name: "Kurz benennen" }), "Die Unterlagen kreisen im Kopf");
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await user.click(screen.getByRole("radio", { name: "Ein reales Problem" }));
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await user.click(screen.getByRole("radio", { name: "Ja" }));
    await user.type(
      screen.getByRole("textbox", { name: "Was ist die kleinste verantwortliche Handlung?" }),
      "RAV-Dokument öffnen",
    );
    await user.click(screen.getByRole("checkbox", { name: "Als Tagesaufgabe übernehmen" }));
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await user.click(screen.getByRole("radio", { name: "Wasser trinken" }));
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await user.click(screen.getByRole("radio", { name: "Nächste Tagesaufgabe" }));
    await user.click(screen.getByRole("button", { name: "Zurück ins Leben" }));

    await user.click(screen.getByRole("button", { name: "Tagesplan öffnen" }));
    await user.click(screen.getByRole("button", { name: "Heute" }));
    const dayBlock = screen.getByRole("heading", { name: "Tages Block" }).closest("section");
    expect(dayBlock).not.toBeNull();
    expect(within(dayBlock as HTMLElement).getByRole("checkbox", {
      name: /RAV-Dokument öffnen.*abhaken/,
    })).toBeInTheDocument();
  });
});

describe("Meditationserfassung", () => {
  it("beendet die Meditation kontrolliert und speichert eine wertungsfreie Antwort", async () => {
    navigation.pathname = "/meditation";
    const user = userEvent.setup();
    await renderWithAppStore(<MeditationPage />, plannedState());

    await user.click(screen.getByRole("radio", { name: "5 Min" }));
    await user.click(screen.getByRole("radio", { name: "Atem" }));
    await user.click(screen.getByRole("button", { name: "Meditation beginnen" }));
    expect(screen.getByRole("timer")).toHaveTextContent("05:00");

    await user.click(screen.getByRole("button", { name: "Beenden" }));
    await user.click(screen.getByRole("radio", { name: "Nicht bewerten" }));
    await user.type(
      screen.getByRole("textbox", { name: /Kurze Notiz/ }),
      "Gedanken kamen und gingen.",
    );
    await user.click(screen.getByRole("button", { name: "Speichern und zurück" }));

    expect(navigation.push).toHaveBeenCalledWith("/today");
  });

  it("bietet mit Identität eine dreiminütige Ausrichtung auf den ersten Schritt an", async () => {
    navigation.pathname = "/meditation";
    const user = userEvent.setup();
    await renderWithAppStore(<MeditationPage />, withIdentity(plannedState()));

    expect(screen.getByRole("radio", { name: "Stille" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: /Ausrichtung/ }));

    expect(screen.getByText("3-Minuten-Ausrichtung")).toBeInTheDocument();
    expect(screen.getByText(/Dokument öffnen/)).toBeInTheDocument();
    expect(screen.getByText(/Ich halte meine Standards ruhig/)).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "5 Min" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ausrichtung beginnen" }));
    expect(screen.getByRole("timer")).toHaveTextContent("03:00");
    expect(screen.getByText("Ausrichtung")).toBeInTheDocument();
  });

  it("nutzt ohne Tagesplan die hinterlegte Act-as-if-Handlung", async () => {
    navigation.pathname = "/meditation";
    const user = userEvent.setup();
    await renderWithAppStore(<MeditationPage />, withIdentity());

    await user.click(screen.getByRole("radio", { name: /Ausrichtung/ }));
    expect(screen.getByText(new RegExp(TEST_IDENTITY.action))).toBeInTheDocument();
  });
});

describe("Wochenreview", () => {
  it("erlaubt übersprungene Fragen und speichert eine kompakte Wochenkarte", async () => {
    navigation.pathname = "/reflection";
    const user = userEvent.setup();
    await renderWithAppStore(<ReflectionPage />);

    await user.click(screen.getByRole("button", { name: "Wochenreview beginnen" }));
    await user.type(
      screen.getByRole("textbox", { name: /Deine Beobachtung/ }),
      "Das Angebot ist klarer geworden.",
    );
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    for (let question = 2; question <= 10; question += 1) {
      await user.click(screen.getByRole("button", { name: "Überspringen" }));
    }

    await user.type(
      screen.getByRole("textbox", { name: "Wichtigstes Ergebnis der Woche" }),
      "Angebot versenden",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Konkretes Ergebnis 1" }),
      "Finale Zahlen prüfen",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Training oder Bewegung" }),
      "Zweimal laufen",
    );
    await user.click(screen.getByRole("button", { name: "Wochenkarte speichern" }));

    expect(screen.getByText("Aktuelle Wochenkarte")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Angebot versenden" })).toBeInTheDocument();
    expect(screen.getByText("Finale Zahlen prüfen")).toBeInTheDocument();
  });
});

describe("Einstellungen, Importvorschau und Löschbestätigung", () => {
  it("speichert persönliche Einstellungen und zeigt eine valide Importvorschau", async () => {
    navigation.pathname = "/settings";
    const user = userEvent.setup();
    await renderWithAppStore(<SettingsPage />, plannedState());

    const name = screen.getByRole("textbox", { name: /Name oder Anrede/ });
    await user.clear(name);
    await user.type(name, "Igor");
    await user.click(screen.getByRole("radio", { name: "Dunkel" }));
    await user.click(screen.getByRole("button", { name: "Einstellungen speichern" }));
    expect(screen.getByRole("button", { name: "Gespeichert" })).toBeInTheDocument();

    const importState = plannedState();
    const exported = serializeDataExport(
      createDataExport(appStateToDataStore(importState), {
        now: new Date("2026-07-20T09:00:00.000Z"),
        appVersion: "0.1.0-test",
      }),
    );
    const file = new File([exported], "backup.json", { type: "application/json" });
    await user.upload(
      screen.getByLabelText("Inner-Compass-JSON-Datei"),
      file,
    );

    expect(await screen.findByText("Importvorschau")).toBeInTheDocument();
    expect(screen.getByText("Tagespläne").nextElementSibling).toHaveTextContent("1");
    await user.click(screen.getByRole("button", { name: "Import bestätigen" }));
    expect(screen.getByRole("status")).toHaveTextContent("Import abgeschlossen.");
  });

  it("löscht erst nach Dialog und exakter zweiter Bestätigung", async () => {
    navigation.pathname = "/settings";
    const user = userEvent.setup();
    await renderWithAppStore(<SettingsPage />, plannedState());

    await user.click(screen.getByRole("button", { name: "Löschen vorbereiten" }));
    const dialog = screen.getByRole("dialog", {
      name: "Alle lokalen Daten dauerhaft löschen?",
    });
    const confirm = within(dialog).getByRole("button", { name: "Endgültig löschen" });
    expect(confirm).toBeDisabled();

    await user.type(within(dialog).getByRole("textbox", { name: "Bestätigung" }), "löschen");
    expect(confirm).toBeDisabled();
    await user.clear(within(dialog).getByRole("textbox", { name: "Bestätigung" }));
    await user.type(within(dialog).getByRole("textbox", { name: "Bestätigung" }), "LÖSCHEN");
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    expect(navigation.push).toHaveBeenCalledWith("/onboarding");
  });
});
