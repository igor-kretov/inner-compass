import { describe, expect, it } from "vitest";

import { RoutineSchema } from "../entities";
import {
  createRoutine,
  materializeRoutineDay,
  routineInstanceProgress,
  setRoutineStepCompleted,
  skipRoutineInstance,
} from "./routines";

const uuid = (index: number) =>
  `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;

function idSequence(start: number): () => string {
  let next = start;
  return () => uuid(next++);
}

describe("wiederverwendbare Routinen", () => {
  it("materialisiert nur passende Wochentage, im Ziel-Zeitraum und idempotent", () => {
    const createdAt = new Date("2026-07-19T18:00:00.000Z");
    const morningRoutine = createRoutine(
      {
        title: "Morgenstart",
        weekdays: [3, 1],
        daySegment: "morning",
        scheduledTime: null,
        steps: ["Wasser trinken", "Tageslicht"],
      },
      {
        id: uuid(1),
        idFactory: idSequence(10),
        now: createdAt,
        timeZone: "America/New_York",
      },
    );
    const tuesdayRoutine = createRoutine(
      {
        title: "Dienstagsroutine",
        weekdays: [2],
        daySegment: "evening",
        scheduledTime: "20:30",
        steps: ["Notieren"],
      },
      { id: uuid(2), idFactory: idSequence(20), now: createdAt },
    );
    const inactiveRoutine = RoutineSchema.parse({
      ...createRoutine(
        {
          title: "Pausiert",
          weekdays: [1],
          daySegment: "day",
          steps: ["Nicht erzeugen"],
        },
        { id: uuid(3), idFactory: idSequence(30), now: createdAt },
      ),
      active: false,
    });

    const instances = materializeRoutineDay({
      routines: [morningRoutine, tuesdayRoutine, inactiveRoutine],
      existingInstances: [],
      localDate: "2026-07-20", // Montag
      timeZone: "Europe/Zurich",
      now: new Date("2026-07-20T05:00:00.000Z"),
    });

    expect(instances).toHaveLength(1);
    expect(instances[0]).toMatchObject({
      routineId: morningRoutine.id,
      localDate: "2026-07-20",
      timeZone: "Europe/Zurich",
      routineTitle: "Morgenstart",
      daySegment: "morning",
      scheduledTime: null,
      sourceRoutineUpdatedAt: morningRoutine.updatedAt,
      status: "open",
    });
    expect(instances[0].steps.map(({ routineStepId, label, order }) => ({
      routineStepId,
      label,
      order,
    }))).toEqual([
      { routineStepId: uuid(10), label: "Wasser trinken", order: 0 },
      { routineStepId: uuid(11), label: "Tageslicht", order: 1 },
    ]);

    expect(
      materializeRoutineDay({
        routines: [morningRoutine],
        existingInstances: instances,
        localDate: "2026-07-20",
        timeZone: "Europe/Zurich",
      }),
    ).toEqual([]);
  });

  it("speichert Tages-Schritte unabhängig und hält den Vorlagen-Snapshot stabil", () => {
    const routine = createRoutine(
      {
        title: "Abendabschluss",
        weekdays: [1],
        daySegment: "evening",
        scheduledTime: "21:15",
        steps: ["Arbeitsplatz schließen", "Morgen notieren"],
      },
      {
        id: uuid(40),
        idFactory: idSequence(41),
        now: new Date("2026-07-19T10:00:00.000Z"),
        timeZone: "Europe/Zurich",
      },
    );
    const [instance] = materializeRoutineDay({
      routines: [routine],
      existingInstances: [],
      localDate: "2026-07-20",
      timeZone: "Europe/Zurich",
      now: new Date("2026-07-20T07:00:00.000Z"),
    });

    const firstDone = setRoutineStepCompleted(
      instance,
      instance.steps[0].id,
      true,
      new Date("2026-07-20T19:00:00.000Z"),
    );
    expect(firstDone.steps[0].completedAt).toBe("2026-07-20T19:00:00.000Z");
    expect(firstDone.steps[1].completedAt).toBeNull();
    expect(firstDone.status).toBe("open");
    expect(routineInstanceProgress(firstDone)).toEqual({
      completed: 1,
      total: 2,
      allCompleted: false,
    });

    const allDone = setRoutineStepCompleted(
      firstDone,
      firstDone.steps[1].id,
      true,
      new Date("2026-07-20T19:05:00.000Z"),
    );
    expect(allDone.status).toBe("completed");
    expect(allDone.completedAt).toBe("2026-07-20T19:05:00.000Z");
    expect(routineInstanceProgress(allDone)).toEqual({
      completed: 2,
      total: 2,
      allCompleted: true,
    });

    const editedTemplate = RoutineSchema.parse({
      ...routine,
      title: "Neuer Titel",
      updatedAt: "2026-07-20T20:00:00.000Z",
      steps: [{ id: uuid(50), label: "Neuer Schritt", order: 0 }],
    });
    expect(editedTemplate.title).toBe("Neuer Titel");
    expect(allDone.routineTitle).toBe("Abendabschluss");
    expect(allDone.steps.map((step) => step.label)).toEqual([
      "Arbeitsplatz schließen",
      "Morgen notieren",
    ]);
    expect(routine.steps.map((step) => step.label)).toEqual([
      "Arbeitsplatz schließen",
      "Morgen notieren",
    ]);

    const reopened = setRoutineStepCompleted(
      allDone,
      allDone.steps[0].id,
      false,
      new Date("2026-07-20T19:10:00.000Z"),
    );
    expect(reopened.status).toBe("open");
    expect(reopened.completedAt).toBeNull();
    expect(reopened.steps[0].completedAt).toBeNull();
    expect(reopened.steps[1].completedAt).toBe("2026-07-20T19:05:00.000Z");
  });

  it("kann eine Tagesinstanz neutral auslassen", () => {
    const routine = createRoutine(
      {
        title: "Mittagspause",
        weekdays: [1],
        daySegment: "day",
        steps: ["Kurz nach draußen"],
      },
      { id: uuid(60), idFactory: idSequence(61) },
    );
    const [instance] = materializeRoutineDay({
      routines: [routine],
      existingInstances: [],
      localDate: "2026-07-20",
      timeZone: "Europe/Zurich",
    });

    const skipped = skipRoutineInstance(
      instance,
      new Date("2026-07-20T12:00:00.000Z"),
    );
    expect(skipped.status).toBe("skipped");
    expect(skipped.skippedAt).toBe("2026-07-20T12:00:00.000Z");
    expect(skipped.completedAt).toBeNull();
  });
});
