import { describe, expect, it } from "vitest";

import type { AppState } from "./app-store";
import { appStateToDataStore, dataStoreToAppState } from "./app-state-adapter";

const ID = {
  plan: "10000000-0000-4000-8000-000000000001",
  primary: "10000000-0000-4000-8000-000000000002",
  secondary: "10000000-0000-4000-8000-000000000003",
  focus: "10000000-0000-4000-8000-000000000004",
  meditation: "10000000-0000-4000-8000-000000000005",
  reset: "10000000-0000-4000-8000-000000000006",
  review: "10000000-0000-4000-8000-000000000007",
  pattern: "10000000-0000-4000-8000-000000000008",
  routine: "10000000-0000-4000-8000-000000000009",
  routineStepOne: "10000000-0000-4000-8000-000000000010",
  routineStepTwo: "10000000-0000-4000-8000-000000000011",
  routineInstance: "10000000-0000-4000-8000-000000000012",
  routineInstanceStepOne: "10000000-0000-4000-8000-000000000013",
  routineInstanceStepTwo: "10000000-0000-4000-8000-000000000014",
  weekPlan: "10000000-0000-4000-8000-000000000015",
  weekBacklog: "10000000-0000-4000-8000-000000000016",
  secondaryMorning: "10000000-0000-4000-8000-000000000017",
  secondaryEvening: "10000000-0000-4000-8000-000000000018",
  carriedFrom: "10000000-0000-4000-8000-000000000019",
};

const CREATED = "2025-04-10T08:00:00.000Z";
const UPDATED = "2025-04-10T12:00:00.000Z";

function completeUiState(): AppState {
  return {
    key: "app",
    schemaVersion: 2,
    onboardingComplete: true,
    settings: {
      name: "Igor",
      dayStart: "07:30",
      meditationTime: "08:00",
      trainingTime: "18:00",
      reviewDay: "0",
      reviewTime: "18:00",
      focusDuration: 50,
      anchors: ["Körper", "Mut"],
      movementCategories: ["Muay Thai", "Fitness", "Spaziergang"],
      theme: "dark",
      sounds: true,
      haptics: false,
      emergencyName: "Alex",
      emergencyPhone: "+41 00 000 00 00",
      timezone: "Europe/Zurich",
    },
    plans: [
      {
        id: ID.plan,
        date: "2025-04-10",
        energy: "medium",
        mentalState: "moving",
        mainTask: {
          id: ID.primary,
          title: "Konzept abschließen",
          completed: true,
          completedAt: UPDATED,
        },
        nextStep: "Dokument öffnen",
        secondaryTasks: [{ id: ID.secondary, title: "Anrufen", completed: false }],
        bodyActivity: "Krafttraining",
        bodyCompleted: true,
        bodyCompletedAt: "2025-04-10T10:00:00.000Z",
        meditationMinutes: 10,
        meditationSkipped: false,
        meditationCompleted: true,
        meditationCompletedAt: "2025-04-10T11:00:00.000Z",
        courageousAction: "Feedback erfragen",
        courageousCompleted: false,
        startTime: "09:00",
        reflection: {
          important: "Der erste Entwurf",
          leaveBehind: "Perfektion",
          note: "Ruhiger als gedacht",
          completedAt: UPDATED,
        },
        createdAt: CREATED,
        updatedAt: UPDATED,
        schemaVersion: 1,
      },
    ],
    focusSessions: [
      {
        id: ID.focus,
        taskId: ID.primary,
        task: "Konzept abschließen",
        expectedOutcome: "Erste Seite fertig",
        durationMinutes: 50,
        startedAt: "2025-04-10T08:10:00.000Z",
        plannedEndAt: "2025-04-10T09:05:00.000Z",
        totalPausedMs: 300_000,
        endedAt: "2025-04-10T09:05:00.000Z",
        status: "review",
        driftStep: "Nur den Absatz schreiben",
        result: "partly",
        bodyCheck: "Wasser",
        createdAt: CREATED,
        updatedAt: UPDATED,
        schemaVersion: 1,
      },
    ],
    meditationSessions: [
      {
        id: ID.meditation,
        durationMinutes: 10,
        focus: "Atem",
        startedAt: "2025-04-10T06:00:00.000Z",
        plannedEndAt: "2025-04-10T06:10:00.000Z",
        totalPausedMs: 0,
        status: "completed",
        presence: "skip",
        endedAt: "2025-04-10T06:10:00.000Z",
        createdAt: CREATED,
        updatedAt: UPDATED,
        schemaVersion: 1,
      },
    ],
    resetSessions: [
      {
        id: ID.reset,
        thought: "Ich drehe mich im Kreis",
        kind: "Eine Entscheidung",
        actionNeeded: "no",
        later: "Morgen",
        bodyReset: "Wasser trinken",
        returnTo: "Lesen",
        createdTask: false,
        createdAt: CREATED,
        updatedAt: UPDATED,
        schemaVersion: 1,
      },
    ],
    weeklyReviews: [
      {
        id: ID.review,
        weekKey: "2025-04-07",
        answers: Array.from({ length: 10 }, (_, index) => `Antwort ${index + 1}`),
        weeklyGoal: "Konzept versenden",
        outcomes: ["Entwurf", "Review", "Versand"],
        movement: "2× Training",
        meditationIntention: "Täglich fünf Minuten",
        omit: "Nebenschauplätze",
        createdAt: CREATED,
        updatedAt: UPDATED,
        schemaVersion: 1,
      },
    ],
    patternEntries: [
      {
        id: ID.pattern,
        trigger: "Eigene Situation",
        bodyState: "Erschöpft",
        thought: "Zu viel",
        impulse: "Ausweichen",
        action: "Spazieren gegangen",
        after: "better",
        createdAt: CREATED,
        updatedAt: UPDATED,
        schemaVersion: 1,
      },
    ],
    routines: [
      {
        id: ID.routine,
        title: "Morgenroutine",
        section: "morning",
        time: "07:15",
        weekdays: [1, 2, 3, 4, 5],
        steps: [
          { id: ID.routineStepOne, title: "Wasser trinken" },
          { id: ID.routineStepTwo, title: "Tageslicht" },
        ],
        enabled: true,
        createdAt: CREATED,
        updatedAt: UPDATED,
        schemaVersion: 2,
        timezone: "Europe/Zurich",
      },
    ],
    routineInstances: [
      {
        id: ID.routineInstance,
        routineId: ID.routine,
        date: "2025-04-10",
        title: "Morgenroutine",
        section: "morning",
        time: "07:15",
        status: "active",
        steps: [
          {
            id: ID.routineInstanceStepOne,
            sourceStepId: ID.routineStepOne,
            title: "Wasser trinken",
            completed: true,
            completedAt: "2025-04-10T06:16:00.000Z",
          },
          {
            id: ID.routineInstanceStepTwo,
            sourceStepId: ID.routineStepTwo,
            title: "Tageslicht",
            completed: false,
          },
        ],
        createdAt: CREATED,
        updatedAt: UPDATED,
        schemaVersion: 2,
        timezone: "Europe/Zurich",
      },
    ],
    weekPlans: [
      {
        id: ID.weekPlan,
        weekKey: "2025-04-07",
        focus: "Konzept fertigstellen",
        outcomes: ["Entwurf teilen", "Feedback einarbeiten"],
        backlog: [
          {
            id: ID.weekBacklog,
            title: "Recherche sortieren",
            status: "scheduled",
            scheduledDate: "2025-04-11",
          },
        ],
        createdAt: CREATED,
        updatedAt: UPDATED,
        schemaVersion: 2,
        timezone: "Europe/Zurich",
      },
    ],
    activeFocusId: ID.focus,
    updatedAt: UPDATED,
  };
}

describe("AppState/DataStore-Adapter", () => {
  it("normalisiert alle UI-Entitäten in strikt validierte Collections", () => {
    const data = appStateToDataStore(completeUiState());
    expect(data).toMatchObject({
      appSettings: [{ schemaVersion: 2, timeZone: "Europe/Zurich" }],
      onboardingStates: [{ completed: true }],
      dailyPlans: [{
        id: ID.plan,
        primaryTaskId: ID.primary,
        bodyCompletedAt: "2025-04-10T10:00:00.000Z",
        meditationCompletedAt: "2025-04-10T11:00:00.000Z",
      }],
      dailyTasks: [{ id: ID.primary }, { id: ID.secondary }],
      focusSessions: [{ id: ID.focus, status: "review", accumulatedPausedMs: 300_000 }],
      meditationSessions: [{ id: ID.meditation, presenceAfter: "not-rated" }],
      resetSessions: [{ id: ID.reset, returnTo: "custom", customReturn: "Lesen" }],
      weeklyReviews: [{ id: ID.review, plannedMovement: "2× Training" }],
      patternEntries: [{ id: ID.pattern, trigger: "custom", customTrigger: "Eigene Situation" }],
      emergencyContacts: [{ name: "Alex", contact: "+41 00 000 00 00" }],
      routines: [
        {
          id: ID.routine,
          daySegment: "morning",
          scheduledTime: "07:15",
          steps: [
            { id: ID.routineStepOne, label: "Wasser trinken", order: 0 },
            { id: ID.routineStepTwo, label: "Tageslicht", order: 1 },
          ],
        },
      ],
      routineInstances: [
        {
          id: ID.routineInstance,
          routineId: ID.routine,
          localDate: "2025-04-10",
          status: "open",
          steps: [
            { routineStepId: ID.routineStepOne, completedAt: "2025-04-10T06:16:00.000Z" },
            { routineStepId: ID.routineStepTwo, completedAt: null },
          ],
        },
      ],
      weekPlans: [
        {
          id: ID.weekPlan,
          weekStartDate: "2025-04-07",
          focus: "Konzept fertigstellen",
          backlog: [
            { id: ID.weekBacklog, status: "scheduled", scheduledDate: "2025-04-11" },
          ],
        },
      ],
    });
    expect(data.dailyReflections).toHaveLength(1);
  });

  it("stellt UI-Zustand, Referenzen und aktive Review-Timer wieder her", () => {
    const restored = dataStoreToAppState(appStateToDataStore(completeUiState()));
    expect(restored).toMatchObject({
      onboardingComplete: true,
      settings: {
        name: "Igor",
        anchors: ["Körper", "Mut"],
        movementCategories: ["Muay Thai", "Fitness", "Spaziergang"],
        emergencyName: "Alex",
      },
      activeFocusId: ID.focus,
      plans: [
        {
          id: ID.plan,
          bodyCompletedAt: "2025-04-10T10:00:00.000Z",
          meditationCompletedAt: "2025-04-10T11:00:00.000Z",
          mainTask: { id: ID.primary, completed: true },
          secondaryTasks: [{ id: ID.secondary }],
          reflection: { important: "Der erste Entwurf" },
        },
      ],
      focusSessions: [{ status: "review", driftStep: "Nur den Absatz schreiben" }],
      meditationSessions: [{ focus: "Atem", presence: "skip" }],
      resetSessions: [{ kind: "Eine Entscheidung", returnTo: "Lesen" }],
      weeklyReviews: [{ movement: "2× Training" }],
      patternEntries: [{ trigger: "Eigene Situation", after: "better" }],
      routines: [
        {
          id: ID.routine,
          section: "morning",
          time: "07:15",
          steps: [
            { id: ID.routineStepOne, title: "Wasser trinken" },
            { id: ID.routineStepTwo, title: "Tageslicht" },
          ],
        },
      ],
      routineInstances: [
        {
          id: ID.routineInstance,
          status: "active",
          steps: [
            { sourceStepId: ID.routineStepOne, completed: true },
            { sourceStepId: ID.routineStepTwo, completed: false },
          ],
        },
      ],
      weekPlans: [
        {
          id: ID.weekPlan,
          focus: "Konzept fertigstellen",
          outcomes: ["Entwurf teilen", "Feedback einarbeiten"],
          backlog: [{ id: ID.weekBacklog, status: "scheduled" }],
        },
      ],
    });
    expect(restored.weeklyReviews[0].answers).toEqual(
      Array.from({ length: 10 }, (_, index) => `Antwort ${index + 1}`),
    );
  });

  it("bewahrt eine bewusst leere Liste eigener Bewegungsarten", () => {
    const state = completeUiState();
    state.settings.movementCategories = [];

    expect(dataStoreToAppState(appStateToDataStore(state)).settings.movementCategories).toEqual([]);
  });

  it("ersetzt ältere Nicht-UUID-IDs deterministisch und hält Referenzen konsistent", () => {
    const state = completeUiState();
    state.plans[0].mainTask.id = "legacy-main";
    state.focusSessions[0].taskId = "legacy-main";
    const first = appStateToDataStore(state);
    const second = appStateToDataStore(state);
    expect(first.dailyTasks[0].id).toBe(second.dailyTasks[0].id);
    expect(first.focusSessions[0].taskId).toBe(first.dailyTasks[0].id);
  });

  it("leitet den Erledigt-Status älterer v2-Aufgaben weiterhin aus completedAt ab", () => {
    const data = appStateToDataStore(completeUiState());
    data.dailyTasks[0] = {
      ...data.dailyTasks[0],
      status: "open",
      completedAt: UPDATED,
    };

    expect(dataStoreToAppState(data).plans[0].mainTask).toMatchObject({
      completed: true,
      status: "completed",
      completedAt: UPDATED,
    });
  });

  it("bewahrt die historische Zeitzone jedes Eintrags bei einer Reise", () => {
    const state = completeUiState();
    state.settings.timezone = "America/New_York";
    (state.plans[0] as typeof state.plans[number] & { timezone: string }).timezone =
      "Europe/Zurich";
    (
      state.focusSessions[0] as typeof state.focusSessions[number] & { timezone: string }
    ).timezone = "Europe/Zurich";

    const data = appStateToDataStore(state);
    expect(data.appSettings[0].timeZone).toBe("America/New_York");
    expect(data.dailyPlans[0].timeZone).toBe("Europe/Zurich");
    expect(data.focusSessions[0].timeZone).toBe("Europe/Zurich");

    const restored = dataStoreToAppState(data);
    expect((restored.plans[0] as typeof restored.plans[number] & { timezone?: string }).timezone).toBe(
      "Europe/Zurich",
    );
  });

  it("bewahrt eine dynamische Aufgabenliste mit Tagesabschnitten, Uhrzeiten und Status", () => {
    const state = completeUiState();
    state.plans[0].secondaryTasks.push(
      {
        id: ID.secondaryMorning,
        title: "Spaziergang",
        completed: false,
        section: "morning",
        plannedTime: "08:30",
        status: "skipped",
        skippedAt: "2025-04-10T07:45:00.000Z",
      },
      {
        id: ID.secondaryEvening,
        title: "Notizen ordnen",
        completed: false,
        section: "evening",
        plannedTime: "20:15",
        status: "deferred",
        deferredAt: "2025-04-10T18:00:00.000Z",
        deferredTo: "2025-04-11",
        originTaskId: ID.carriedFrom,
      },
    );

    const data = appStateToDataStore(state);
    expect(data.dailyPlans[0].secondaryTaskIds).toHaveLength(3);
    expect(data.dailyTasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: ID.secondaryMorning,
          daySegment: "morning",
          scheduledTime: "08:30",
          status: "skipped",
        }),
        expect.objectContaining({
          id: ID.secondaryEvening,
          daySegment: "evening",
          scheduledTime: "20:15",
          status: "deferred",
          deferredToDate: "2025-04-11",
          carriedFromTaskId: ID.carriedFrom,
        }),
      ]),
    );

    const restored = dataStoreToAppState(data);
    expect(restored.plans[0].secondaryTasks).toHaveLength(3);
    expect(restored.plans[0].secondaryTasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: ID.secondaryMorning,
          section: "morning",
          plannedTime: "08:30",
          status: "skipped",
        }),
        expect.objectContaining({
          id: ID.secondaryEvening,
          section: "evening",
          plannedTime: "20:15",
          status: "deferred",
          deferredTo: "2025-04-11",
          originTaskId: ID.carriedFrom,
        }),
      ]),
    );
  });

  it("hält generierte Wochenziel-IDs über einen vollständigen Adapter-Roundtrip stabil", () => {
    const first = appStateToDataStore(completeUiState());
    const restored = dataStoreToAppState(first);
    const second = appStateToDataStore(restored);

    expect(second.weekPlans[0].outcomes.map((item) => item.id)).toEqual(
      first.weekPlans[0].outcomes.map((item) => item.id),
    );
  });

  it("erhält Identitätspraxis und einen manuellen Identitätsbeweis im Roundtrip", () => {
    const state = completeUiState();
    state.settings.identity = {
      statement: "Ich bin jemand, der seine Zusagen hält.",
      action: "Ich beginne mit dem kleinsten sinnvollen Schritt.",
      startedAt: "2025-04-10T07:00:00.000Z",
      reframe: "Ich habe bereits oft neu begonnen und weitergemacht.",
      rehearsalDates: ["2025-04-10", "2025-04-11"],
    };
    state.plans[0].reflection = {
      ...state.plans[0].reflection!,
      identityEvidence: "Ich habe trotz Widerstand angefangen.",
    };

    const data = appStateToDataStore(state);
    expect(data.appSettings[0].identityPractice).toEqual(state.settings.identity);
    expect(data.dailyReflections[0].identityEvidence).toBe(
      "Ich habe trotz Widerstand angefangen.",
    );

    const restored = dataStoreToAppState(data);
    expect(restored.settings.identity).toEqual(state.settings.identity);
    expect(restored.plans[0].reflection?.identityEvidence).toBe(
      "Ich habe trotz Widerstand angefangen.",
    );
  });

  it("erhält Ausrichtung als eigenen Meditationsfokus im Roundtrip", () => {
    const state = completeUiState();
    state.meditationSessions[0].focus = "Ausrichtung";

    const data = appStateToDataStore(state);
    expect(data.meditationSessions[0].focus).toBe("identity-rehearsal");
    expect(dataStoreToAppState(data).meditationSessions[0].focus).toBe("Ausrichtung");
  });

  it("behält bei begrenzten Einstellungen die neuesten Kategorien und Probentage", () => {
    const state = completeUiState();
    const movementCategories = Array.from(
      { length: 31 },
      (_, index) => `Bewegung ${String(index + 1).padStart(2, "0")}`,
    );
    const rehearsalDates = Array.from({ length: 367 }, (_, index) => {
      const date = new Date(Date.UTC(2025, 0, index + 1));
      return date.toISOString().slice(0, 10);
    });
    state.settings.movementCategories = movementCategories;
    state.settings.identity = {
      statement: "Ich halte meine Zusagen ruhig und verlässlich.",
      startedAt: "2025-01-01T08:00:00.000Z",
      rehearsalDates,
    };

    const data = appStateToDataStore(state);
    const storedMovements = data.appSettings[0].movementCategories;
    const storedRehearsals = data.appSettings[0].identityPractice?.rehearsalDates;

    expect(storedMovements).toHaveLength(30);
    expect(storedMovements.at(0)).toBe(movementCategories[1]);
    expect(storedMovements.at(-1)).toBe(movementCategories.at(-1));
    expect(storedRehearsals).toHaveLength(366);
    expect(storedRehearsals?.at(0)).toBe(rehearsalDates[1]);
    expect(storedRehearsals?.at(-1)).toBe(rehearsalDates.at(-1));
  });

  it("legt ohne Telefonnummer keinen unvollständigen Notfallkontakt an", () => {
    const state = completeUiState();
    state.settings.emergencyPhone = "";
    const data = appStateToDataStore(state);
    expect(data.emergencyContacts).toEqual([]);
    expect(data.appSettings[0].emergencyContactId).toBeNull();
  });
});
