import { describe, expect, it } from "vitest";

import { emptyState, type AppState } from "./app-store";
import { collectIdentityEvidence, prepareIdentityProfile } from "./identity";

const STARTED_AT = "2025-04-10T08:00:00.000Z";

function identityState(): AppState {
  const state = emptyState();
  state.settings = {
    ...state.settings,
    timezone: "Europe/Zurich",
    identity: {
      statement: "Ich bin jemand, der seine Zusagen hält.",
      action: "Ich beginne mit dem kleinsten sinnvollen Schritt.",
      startedAt: STARTED_AT,
      rehearsalDates: ["2025-04-09", "2025-04-10"],
    },
  };
  state.plans = [
    {
      id: "plan-1",
      date: "2025-04-10",
      mainTask: {
        id: "task-1",
        title: "Konzept abschließen",
        completed: true,
        status: "completed",
        completedAt: "2025-04-10T09:00:00.000Z",
      },
      nextStep: "Dokument öffnen",
      secondaryTasks: [
        {
          id: "old-task",
          title: "Alter Abschluss",
          completed: true,
          status: "completed",
          completedAt: "2025-04-09T09:00:00.000Z",
        },
      ],
      bodyActivity: "Muay Thai",
      bodyCompleted: true,
      bodyCompletedAt: "2025-04-10T15:00:00.000Z",
      meditationMinutes: 10,
      meditationSkipped: false,
      meditationCompleted: true,
      meditationCompletedAt: "2025-04-10T16:00:00.000Z",
      courageousAction: "Schwierigen Anruf machen",
      courageousCompleted: true,
      courageousCompletedAt: "2025-04-10T17:00:00.000Z",
      reflection: {
        identityEvidence: "Ich habe trotz Widerstand angefangen.",
        completedAt: "2025-04-10T19:00:00.000Z",
      },
      createdAt: "2025-04-09T18:00:00.000Z",
      updatedAt: "2025-04-10T18:00:00.000Z",
      schemaVersion: 2,
      timezone: "Europe/Zurich",
    },
  ];
  state.focusSessions = [
    {
      id: "linked-focus",
      taskId: "task-1",
      task: "Konzept abschließen",
      expectedOutcome: "Konzept steht",
      durationMinutes: 50,
      startedAt: "2025-04-10T08:05:00.000Z",
      plannedEndAt: "2025-04-10T08:55:00.000Z",
      totalPausedMs: 0,
      endedAt: "2025-04-10T08:55:00.000Z",
      status: "completed",
      createdAt: "2025-04-10T08:05:00.000Z",
      updatedAt: "2025-04-10T08:55:00.000Z",
      schemaVersion: 2,
      timezone: "Europe/Zurich",
    },
    {
      id: "free-focus",
      task: "Recherche sortieren",
      expectedOutcome: "Drei Quellen wählen",
      durationMinutes: 25,
      startedAt: "2025-04-10T10:00:00.000Z",
      plannedEndAt: "2025-04-10T10:25:00.000Z",
      totalPausedMs: 0,
      endedAt: "2025-04-10T10:25:00.000Z",
      status: "completed",
      createdAt: "2025-04-10T10:00:00.000Z",
      updatedAt: "2025-04-10T10:25:00.000Z",
      schemaVersion: 2,
      timezone: "Europe/Zurich",
    },
  ];
  state.meditationSessions = [
    {
      id: "meditation-1",
      durationMinutes: 10,
      startedAt: "2025-04-10T11:00:00.000Z",
      plannedEndAt: "2025-04-10T11:10:00.000Z",
      totalPausedMs: 0,
      endedAt: "2025-04-10T11:10:00.000Z",
      status: "completed",
      createdAt: "2025-04-10T11:00:00.000Z",
      updatedAt: "2025-04-10T11:10:00.000Z",
      schemaVersion: 2,
      timezone: "Europe/Zurich",
    },
  ];
  state.routineInstances = [
    {
      id: "routine-instance-1",
      routineId: "routine-1",
      date: "2025-04-10",
      title: "Morgenroutine",
      section: "morning",
      status: "active",
      steps: [
        {
          id: "routine-step-1",
          sourceStepId: "routine-template-step-1",
          title: "Wasser trinken",
          completed: true,
          completedAt: "2025-04-10T08:15:00.000Z",
        },
      ],
      createdAt: "2025-04-10T08:00:00.000Z",
      updatedAt: "2025-04-10T08:15:00.000Z",
      schemaVersion: 2,
      timezone: "Europe/Zurich",
    },
  ];
  return state;
}

describe("Identitätsbeweise", () => {
  it("startet nur bei einem neuen Identitätssatz einen neuen Übungszeitraum", () => {
    const current = identityState().settings.identity!;

    expect(prepareIdentityProfile({
      current,
      statement: current.statement,
      action: "Ich atme aus und beginne.",
      now: "2025-04-20T08:00:00.000Z",
    })).toMatchObject({
      action: "Ich atme aus und beginne.",
      startedAt: STARTED_AT,
      rehearsalDates: current.rehearsalDates,
    });

    expect(prepareIdentityProfile({
      current: { ...current, reframe: "Ich kann ruhig neu beginnen." },
      statement: "Ich tue das Wichtige, bevor es dringend wird.",
      action: current.action,
      now: "2025-04-20T08:00:00.000Z",
    })).toEqual({
      statement: "Ich tue das Wichtige, bevor es dringend wird.",
      action: current.action,
      startedAt: "2025-04-20T08:00:00.000Z",
      reframe: undefined,
      rehearsalDates: [],
    });
  });

  it("liefert ohne eingerichtete Identität keine Beweise", () => {
    expect(collectIdentityEvidence(emptyState())).toEqual([]);
  });

  it("sammelt Abschlüsse seit dem Start und dedupliziert verknüpfte Quellen", () => {
    const evidence = collectIdentityEvidence(identityState());

    expect(evidence.map((item) => item.type)).toEqual(expect.arrayContaining([
      "task",
      "focus",
      "movement",
      "meditation",
      "courage",
      "routine",
      "rehearsal",
      "reflection",
    ]));
    expect(evidence).toHaveLength(8);
    expect(evidence.some((item) => item.id === "focus:linked-focus")).toBe(false);
    expect(evidence.some((item) => item.id === "task:old-task")).toBe(false);
    expect(evidence.filter((item) => item.type === "meditation")).toEqual([
      expect.objectContaining({ id: "meditation:meditation-1" }),
    ]);
    expect(evidence.map((item) => item.occurredAt)).toEqual(
      [...evidence.map((item) => item.occurredAt)].sort().reverse(),
    );
  });

  it("behandelt ein wieder geöffnetes Element nicht mehr als Beweis", () => {
    const state = identityState();
    state.plans[0].mainTask.completed = false;
    state.plans[0].mainTask.status = "open";

    const evidence = collectIdentityEvidence(state);
    expect(evidence.some((item) => item.id === "task:task-1")).toBe(false);
    expect(evidence.some((item) => item.id === "focus:linked-focus")).toBe(true);
  });

  it("ordnet eine abgeschlossene Ausrichtung als mentale Probe ein", () => {
    const state = identityState();
    state.settings.identity!.rehearsalDates = [];
    state.plans[0].meditationCompleted = false;
    state.meditationSessions[0].focus = "Ausrichtung";

    expect(collectIdentityEvidence(state)).toContainEqual(
      expect.objectContaining({
        id: "meditation:meditation-1",
        label: "Mentale Probe durchgeführt",
        type: "rehearsal",
      }),
    );
  });

  it("hält Abschlusszeitpunkte stabil, wenn der Tagesplan später bearbeitet wird", () => {
    const state = identityState();
    const before = collectIdentityEvidence(state)
      .filter((item) => ["movement", "meditation", "courage"].includes(item.type))
      .map(({ id, occurredAt }) => ({ id, occurredAt }));

    state.plans[0].updatedAt = "2025-04-12T20:00:00.000Z";

    expect(collectIdentityEvidence(state)
      .filter((item) => ["movement", "meditation", "courage"].includes(item.type))
      .map(({ id, occurredAt }) => ({ id, occurredAt }))).toEqual(before);
  });
});
