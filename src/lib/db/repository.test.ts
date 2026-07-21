import { afterEach, describe, expect, it } from "vitest";

import { createDefaultSettings } from "@/domain/factories";
import type { Routine, RoutineInstance, WeeklyPlan } from "@/domain/entities";

import { DATABASE_VERSION, createRepository } from "./repository";

const KEY = "inner-compass:test:data";
const ID = "00000000-0000-4000-8000-000000000001";
const PLANNER_ID = {
  routine: "00000000-0000-4000-8000-000000000010",
  routineStep: "00000000-0000-4000-8000-000000000011",
  routineInstance: "00000000-0000-4000-8000-000000000012",
  routineInstanceStep: "00000000-0000-4000-8000-000000000013",
  weekPlan: "00000000-0000-4000-8000-000000000014",
  outcome: "00000000-0000-4000-8000-000000000015",
  backlog: "00000000-0000-4000-8000-000000000016",
};

function plannerRecords(): {
  routine: Routine;
  routineInstance: RoutineInstance;
  weekPlan: WeeklyPlan;
} {
  const metadata = {
    createdAt: "2025-04-10T10:00:00.000Z",
    updatedAt: "2025-04-10T11:00:00.000Z",
    timeZone: "Europe/Zurich",
    schemaVersion: 2 as const,
  };
  return {
    routine: {
      ...metadata,
      id: PLANNER_ID.routine,
      title: "Morgenroutine",
      weekdays: [1, 2, 3, 4, 5],
      daySegment: "morning",
      scheduledTime: "07:15",
      steps: [{ id: PLANNER_ID.routineStep, label: "Wasser trinken", order: 0 }],
      active: true,
      archivedAt: null,
    },
    routineInstance: {
      ...metadata,
      id: PLANNER_ID.routineInstance,
      routineId: PLANNER_ID.routine,
      localDate: "2025-04-10",
      routineTitle: "Morgenroutine",
      daySegment: "morning",
      scheduledTime: "07:15",
      sourceRoutineUpdatedAt: metadata.updatedAt,
      steps: [
        {
          id: PLANNER_ID.routineInstanceStep,
          routineStepId: PLANNER_ID.routineStep,
          label: "Wasser trinken",
          order: 0,
          completedAt: null,
        },
      ],
      status: "open",
      completedAt: null,
      skippedAt: null,
    },
    weekPlan: {
      ...metadata,
      id: PLANNER_ID.weekPlan,
      weekStartDate: "2025-04-07",
      focus: "Konzept fertigstellen",
      outcomes: [
        {
          id: PLANNER_ID.outcome,
          title: "Entwurf teilen",
          status: "open",
          scheduledDate: null,
          completedAt: null,
        },
      ],
      backlog: [
        {
          id: PLANNER_ID.backlog,
          title: "Recherche sortieren",
          status: "scheduled",
          scheduledDate: "2025-04-11",
          completedAt: null,
        },
      ],
    },
  };
}

afterEach(() => localStorage.removeItem(KEY));

describe("Local-first Repository", () => {
  it("stellt bei fehlendem IndexedDB mindestens einen In-Memory-Store bereit", async () => {
    const repository = createRepository({ forceBackend: "indexedDB", storage: null });
    const settings = createDefaultSettings({
      id: ID,
      now: new Date("2025-04-10T10:00:00.000Z"),
      timeZone: "Europe/Zurich",
    });
    await repository.put("appSettings", settings);
    expect(await repository.backendKind()).toBe("memory");
    expect(await repository.get("appSettings", ID)).toEqual(settings);
    await repository.close();
  });

  it("persistiert im localStorage-Fallback über Repository-Instanzen hinweg", async () => {
    const first = createRepository({
      forceBackend: "localStorage",
      storage: localStorage,
      localStorageKey: KEY,
    });
    const settings = createDefaultSettings({
      id: ID,
      now: new Date("2025-04-10T10:00:00.000Z"),
      timeZone: "Europe/Zurich",
    });
    await first.save("appSettings", settings);
    await first.close();

    const second = createRepository({
      forceBackend: "localStorage",
      storage: localStorage,
      localStorageKey: KEY,
    });
    expect(await second.list("appSettings")).toEqual([settings]);
    await second.close();
  });

  it("unterstützt CRUD und Export für alle neuen Planner-Collections", async () => {
    expect(DATABASE_VERSION).toBe(3);
    const repository = createRepository({ forceBackend: "memory" });
    const records = plannerRecords();

    await repository.put("routines", records.routine);
    await repository.put("routineInstances", records.routineInstance);
    await repository.put("weekPlans", records.weekPlan);

    expect(await repository.get("routines", records.routine.id)).toEqual(records.routine);
    expect(await repository.list("routineInstances")).toEqual([records.routineInstance]);
    expect(await repository.getAll("weekPlans")).toEqual([records.weekPlan]);

    const updatedRoutine = {
      ...records.routine,
      title: "Ruhige Morgenroutine",
      updatedAt: "2025-04-10T12:00:00.000Z",
    };
    await repository.save("routines", updatedRoutine);
    expect((await repository.get("routines", records.routine.id))?.title).toBe(
      "Ruhige Morgenroutine",
    );

    const exported = await repository.exportData();
    expect(exported.routines).toHaveLength(1);
    expect(exported.routineInstances).toEqual([records.routineInstance]);
    expect(exported.weekPlans).toEqual([records.weekPlan]);

    expect(await repository.delete("routineInstances", records.routineInstance.id)).toBe(true);
    expect(await repository.delete("routineInstances", records.routineInstance.id)).toBe(false);
    await repository.clear("weekPlans");
    expect(await repository.list("routineInstances")).toEqual([]);
    expect(await repository.list("weekPlans")).toEqual([]);
    await repository.close();
  });

  it("löscht alle Collections gemeinsam", async () => {
    const repository = createRepository({ forceBackend: "memory" });
    await repository.put(
      "appSettings",
      createDefaultSettings({ id: ID, timeZone: "Europe/Zurich" }),
    );
    await repository.clearAll();
    expect(await repository.exportData()).toMatchObject({ appSettings: [] });
    await repository.close();
  });
});
