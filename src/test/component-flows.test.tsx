import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  type RoutineInstance,
  type RoutineTemplate,
} from "@/lib/app-store";
import { createDataExport, serializeDataExport } from "@/lib/data-transfer";
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

function stateWithTodaysRoutine() {
  const timestamp = "2026-07-20T08:00:00.000Z";
  const date = localDateKey();
  const weekday = new Date(`${date}T12:00:00`).getDay();
  const routine: RoutineTemplate = {
    id: "44444444-4444-4444-8444-444444444444",
    title: "Morgenstart",
    section: "morning",
    time: "07:15",
    weekdays: [weekday],
    steps: [
      { id: "55555555-5555-4555-8555-555555555555", title: "Wasser trinken" },
      { id: "66666666-6666-4666-8666-666666666666", title: "Kurz bewegen" },
    ],
    enabled: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion: 1,
  };
  const instance: RoutineInstance = {
    id: "77777777-7777-4777-8777-777777777777",
    routineId: routine.id,
    date,
    title: routine.title,
    section: routine.section,
    time: routine.time,
    status: "active",
    steps: [
      {
        id: "88888888-8888-4888-8888-888888888888",
        sourceStepId: routine.steps[0].id,
        title: routine.steps[0].title,
        completed: false,
      },
      {
        id: "99999999-9999-4999-8999-999999999999",
        sourceStepId: routine.steps[1].id,
        title: routine.steps[1].title,
        completed: false,
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion: 1,
  };

  return plannedState({ routines: [routine], routineInstances: [instance] });
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

describe("Tagesplanung und Aufgabenabschluss", () => {
  it("speichert einen bewusst geplanten Tag und zeigt die reduzierte Ansicht", async () => {
    const user = userEvent.setup();
    await renderWithAppStore(<TodayPage />);

    await user.type(
      screen.getByRole("textbox", { name: /Hauptaufgabe/ }),
      "Präsentation abschließen",
    );
    await user.type(
      screen.getByRole("textbox", { name: /Nächster konkreter Schritt/ }),
      "Folie eins öffnen",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Nebenaufgabe 1" }),
      "Termin bestätigen",
    );
    await user.type(
      screen.getByRole("combobox", { name: /Körper/ }),
      "Krafttraining",
    );
    await user.click(screen.getByRole("radio", { name: "Hoch" }));
    await user.click(screen.getByRole("button", { name: "Tag speichern" }));

    const mainTaskHeading = screen.getByRole("heading", {
      name: "Präsentation abschließen",
    });
    expect(mainTaskHeading).toBeInTheDocument();
    expect(mainTaskHeading.parentElement).toHaveTextContent(
      "Nächster Schritt: Folie eins öffnen",
    );
    expect(
      screen.getByRole("checkbox", { name: /Termin bestätigen/ }),
    ).not.toBeChecked();

    await user.click(screen.getByRole("button", { name: "Bearbeiten" }));
    expect(screen.getByRole("textbox", { name: /Hauptaufgabe/ })).toHaveValue(
      "Präsentation abschließen",
    );
  });

  it("schließt Haupt- und Nebenaufgaben ohne Gamification ab", async () => {
    const user = userEvent.setup();
    await renderWithAppStore(<TodayPage />, plannedState());

    const mainTask = screen.getByRole("checkbox", {
      name: "Hauptaufgabe abschließen",
    });
    const secondaryTask = screen.getByRole("checkbox", {
      name: /Rückruf erledigen/,
    });

    await user.click(mainTask);
    await user.click(secondaryTask);

    expect(mainTask).toBeChecked();
    expect(secondaryTask).toBeChecked();
    expect(screen.getByRole("button", { name: "Erledigt" })).toBeDisabled();
    expect(screen.queryByText(/Punkte|Streak|versagt/i)).not.toBeInTheDocument();
  });
});

describe("Tages-, Routinen- und Wochenplaner", () => {
  it("wechselt über die zugänglichen Tabs zwischen Tag, Routinen und Woche", async () => {
    const user = userEvent.setup();
    await renderWithAppStore(<TodayPage />);

    const tabs = screen.getByRole("navigation", { name: "Planerbereiche" });
    const dayTab = within(tabs).getByRole("button", { name: "Tag" });
    const routinesTab = within(tabs).getByRole("button", { name: "Routinen" });
    const weekTab = within(tabs).getByRole("button", { name: "Woche" });

    expect(dayTab).toHaveAttribute("aria-current", "page");
    await user.click(routinesTab);
    expect(routinesTab).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "Routinen geben dem Tag Halt." })).toBeInTheDocument();

    await user.click(weekTab);
    expect(weekTab).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "Richtung vor Dichte." })).toBeInTheDocument();

    await user.click(dayTab);
    expect(dayTab).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("group", { name: "Tag auswählen" })).toBeInTheDocument();
  });

  it("legt eine Routine mit Wochentagen, optionaler Uhrzeit und mehreren Schritten an", async () => {
    const user = userEvent.setup();
    await renderWithAppStore(<TodayPage />);

    await user.click(screen.getByRole("button", { name: "Routinen" }));
    await user.click(screen.getByRole("button", { name: "Neue Routine" }));
    await user.type(screen.getByRole("textbox", { name: "Name der Routine" }), "Morgenstart");
    await user.type(screen.getByLabelText("Uhrzeit"), "07:15");

    const saturday = screen.getByRole("button", { name: "Samstag" });
    expect(saturday).toHaveAttribute("aria-pressed", "false");
    await user.click(saturday);
    expect(saturday).toHaveAttribute("aria-pressed", "true");

    await user.type(screen.getByRole("textbox", { name: "Schritt 1" }), "Wasser trinken");
    await user.click(screen.getByRole("button", { name: "Schritt hinzufügen" }));
    await user.type(screen.getByRole("textbox", { name: "Schritt 2" }), "Kurz bewegen");
    await user.click(screen.getByRole("button", { name: "Routine speichern" }));

    expect(screen.getByRole("heading", { name: "Morgenstart" })).toBeInTheDocument();
    expect(screen.getByText(/07:15.*Sa/)).toBeInTheDocument();
    expect(screen.getByText("Wasser trinken")).toBeInTheDocument();
    expect(screen.getByText("Kurz bewegen")).toBeInTheDocument();
  });

  it("hakt einen Routine-Schritt ab und lässt das heutige Vorkommen bewusst aus", async () => {
    const user = userEvent.setup();
    await renderWithAppStore(<TodayPage />, stateWithTodaysRoutine());

    const waterStep = screen.getByRole("checkbox", {
      name: "Wasser trinken in Morgenstart",
    });
    expect(waterStep).not.toBeChecked();
    expect(screen.getByText("0 von 2 Schritten")).toBeInTheDocument();

    await user.click(waterStep);
    expect(waterStep).toBeChecked();
    expect(screen.getByText("1 von 2 Schritten")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Heute auslassen" }));
    expect(screen.getByText("Heute bewusst ausgelassen")).toBeInTheDocument();
    expect(waterStep).toBeDisabled();
    expect(screen.getByRole("button", { name: "Wieder aufnehmen" })).toBeInTheDocument();
  });

  it("legt eine Aufgabe mit Tagesabschnitt und Uhrzeit an und verschiebt sie auf morgen", async () => {
    const user = userEvent.setup();
    await renderWithAppStore(<TodayPage />, plannedState());

    await user.click(screen.getByRole("button", { name: "Aufgabe hinzufügen" }));
    await user.type(screen.getByRole("textbox", { name: "Neue Aufgabe" }), "Rechnung senden");
    await user.click(screen.getByRole("radio", { name: "Abend" }));
    await user.type(screen.getByLabelText("Uhrzeit"), "18:45");
    await user.click(screen.getByRole("button", { name: "Hinzufügen" }));

    const eveningSection = screen.getByRole("heading", { name: "Abend" }).closest("section");
    expect(eveningSection).not.toBeNull();
    expect(within(eveningSection as HTMLElement).getByRole("checkbox", { name: "Rechnung senden" })).not.toBeChecked();
    expect(eveningSection).toHaveTextContent("18:45");

    await user.click(screen.getByRole("button", { name: "Optionen für Rechnung senden" }));
    await user.click(screen.getByRole("button", { name: /^Auf .* verschieben$/ }));
    expect(eveningSection).toHaveTextContent("verschoben");

    const tomorrow = shiftLocalDate(localDateKey(), 1);
    const tomorrowLabel = new Intl.DateTimeFormat("de-CH", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(`${tomorrow}T12:00:00`));
    if (!screen.queryByRole("button", { name: tomorrowLabel })) {
      await user.click(screen.getByRole("button", { name: "Nächste Woche" }));
    }
    await user.click(screen.getByRole("button", { name: tomorrowLabel }));

    expect(screen.getByRole("heading", { name: "Rechnung senden" })).toBeInTheDocument();
    expect(screen.getByText("Startanker · 18:45")).toBeInTheDocument();
  });

  it("speichert einen Wochenplan und ordnet eine Wochenaufgabe einem Tag zu", async () => {
    const user = userEvent.setup();
    await renderWithAppStore(<TodayPage />);

    await user.click(screen.getByRole("button", { name: "Woche" }));
    await user.type(screen.getByRole("textbox", { name: "Wichtigster Fokus" }), "Website veröffentlichen");
    await user.type(screen.getByRole("textbox", { name: "Wochenergebnis 1" }), "Texte freigeben");
    await user.type(screen.getByRole("textbox", { name: "Wochenaufgabe 1" }), "Team-Freigabe einholen");
    await user.click(screen.getByRole("button", { name: "Wochenplan speichern" }));

    expect(screen.getByRole("heading", { name: "Website veröffentlichen" })).toBeInTheDocument();
    expect(screen.getByText("Texte freigeben")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Einplanen" }));

    const scheduleDialog = screen.getByRole("dialog", { name: "Welcher Tag passt?" });
    await user.click(within(scheduleDialog).getByRole("button", { name: /Heute/ }));
    expect(screen.getByText(/Eingeplant für/)).toBeInTheDocument();

    const scheduledItem = screen.getByRole("checkbox", {
      name: "Team-Freigabe einholen als Wochenaufgabe erledigt",
    });
    await user.click(
      within(scheduledItem.parentElement as HTMLElement).getByRole("button", {
        name: "Tag öffnen",
      }),
    );
    const tabs = screen.getByRole("navigation", { name: "Planerbereiche" });
    expect(within(tabs).getByRole("button", { name: "Tag" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "Team-Freigabe einholen" })).toBeInTheDocument();
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
