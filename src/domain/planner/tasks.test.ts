import { describe, expect, it } from "vitest";

import {
  DailyPlanSchema,
  DailyTaskSchema,
  type DailyTask,
} from "../entities";
import {
  completeDailyTask,
  deferDailyTaskToTomorrow,
  reopenDailyTask,
  skipDailyTask,
} from "./tasks";

const uuid = (index: number) =>
  `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;

const createdAt = "2026-03-28T08:00:00.000Z";

function task(overrides: Partial<DailyTask> = {}): DailyTask {
  return DailyTaskSchema.parse({
    id: uuid(1),
    createdAt,
    updatedAt: createdAt,
    timeZone: "Europe/Zurich",
    schemaVersion: 2,
    dailyPlanId: uuid(2),
    role: "primary",
    title: "Konzept abschließen",
    nextStep: "Gliederung prüfen",
    order: 0,
    daySegment: "evening",
    scheduledTime: "21:30",
    ...overrides,
  });
}

describe("dynamische Tagesaufgaben", () => {
  it("erlaubt 30 Listeneinträge und bleibt zu alten Primär-/Sekundärdaten kompatibel", () => {
    const secondaryTaskIds = Array.from({ length: 30 }, (_, index) => uuid(index + 100));
    const plan = DailyPlanSchema.parse({
      id: uuid(90),
      createdAt,
      updatedAt: createdAt,
      timeZone: "Europe/Zurich",
      schemaVersion: 2,
      localDate: "2026-03-28",
      primaryTaskId: uuid(91),
      secondaryTaskIds,
    });

    expect(plan.primaryTaskId).toBe(uuid(91));
    expect(plan.secondaryTaskIds).toEqual(secondaryTaskIds);
    expect(plan).toMatchObject({
      intention: null,
      focusNote: null,
      plannerBlocks: [],
    });
    expect(
      DailyPlanSchema.safeParse({
        ...plan,
        secondaryTaskIds: [...secondaryTaskIds, uuid(130)],
      }).success,
    ).toBe(false);

    const legacyTask = DailyTaskSchema.parse({
      id: uuid(92),
      createdAt,
      updatedAt: createdAt,
      timeZone: "Europe/Zurich",
      schemaVersion: 2,
      dailyPlanId: plan.id,
      role: "secondary",
      title: "Bestehende Nebenaufgabe",
      order: 1,
    });
    expect(legacyTask).toMatchObject({
      role: "secondary",
      plannerBlockId: null,
      daySegment: "day",
      scheduledTime: null,
      status: "open",
    });
  });

  it("setzt erledigt, ausgelassen und wieder offen als getrennte Zustände", () => {
    const source = task();
    const completed = completeDailyTask(
      source,
      new Date("2026-03-28T09:00:00.000Z"),
    );
    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBe("2026-03-28T09:00:00.000Z");

    const skipped = skipDailyTask(
      completed,
      new Date("2026-03-28T09:05:00.000Z"),
    );
    expect(skipped.status).toBe("skipped");
    expect(skipped.skippedAt).toBe("2026-03-28T09:05:00.000Z");
    expect(skipped.completedAt).toBeNull();

    const reopened = reopenDailyTask(
      skipped,
      new Date("2026-03-28T09:10:00.000Z"),
    );
    expect(reopened.status).toBe("open");
    expect(reopened.completedAt).toBeNull();
    expect(reopened.skippedAt).toBeNull();
    expect(reopened.deferredAt).toBeNull();
  });

  it("verschiebt exakt auf den nächsten Kalendertag und erzeugt eine stabile Ziel-ID", () => {
    const source = task({
      status: "completed",
      completedAt: "2026-03-28T10:00:00.000Z",
    });
    const first = deferDailyTaskToTomorrow({
      task: source,
      currentLocalDate: "2026-03-28", // Vor Zürcher Sommerzeitwechsel
      tomorrowPlanId: uuid(3),
      tomorrowOrder: 7,
      now: new Date("2026-03-28T20:30:00.000Z"),
      tomorrowTimeZone: "Europe/Zurich",
    });
    const repeated = deferDailyTaskToTomorrow({
      task: source,
      currentLocalDate: "2026-03-28",
      tomorrowPlanId: uuid(3),
      tomorrowOrder: 7,
      now: new Date("2026-03-28T21:30:00.000Z"),
      tomorrowTimeZone: "Europe/Zurich",
    });

    expect(first.deferredTask).toMatchObject({
      id: source.id,
      status: "deferred",
      completedAt: null,
      deferredAt: "2026-03-28T20:30:00.000Z",
      deferredToDate: "2026-03-29",
      deferredToTaskId: first.tomorrowTask.id,
    });
    expect(first.tomorrowTask).toMatchObject({
      dailyPlanId: uuid(3),
      role: "secondary",
      title: source.title,
      nextStep: source.nextStep,
      order: 7,
      daySegment: "evening",
      scheduledTime: "21:30",
      status: "open",
      carriedFromTaskId: source.id,
      timeZone: "Europe/Zurich",
    });
    expect(first.tomorrowTask.id).toBe(repeated.tomorrowTask.id);
    expect(repeated.deferredTask.deferredToDate).toBe("2026-03-29");
    expect(repeated.deferredTask.deferredToTaskId).toBe(first.tomorrowTask.id);
  });
});
