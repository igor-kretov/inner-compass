import { describe, expect, it } from "vitest";

import { WeeklyPlanSchema } from "../entities";
import {
  addWeeklyPlanItem,
  createWeeklyPlan,
  scheduleWeeklyPlanItem,
  setWeeklyPlanItemCompleted,
} from "./week";

const uuid = (index: number) =>
  `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;

function idSequence(start: number): () => string {
  let next = start;
  return () => uuid(next++);
}

describe("schlanker Wochenplan", () => {
  it("speichert Wochenfokus, höchstens drei Ergebnisse und einen Backlog", () => {
    const plan = createWeeklyPlan(
      {
        weekStartDate: "2026-07-20",
        focus: "Die Präsentation entscheidungsreif machen",
        outcomes: ["Narrativ steht", "Zahlen geprüft", "Probe gehalten"],
        backlog: ["Notizen sortieren"],
      },
      {
        id: uuid(1),
        idFactory: idSequence(10),
        now: new Date("2026-07-20T06:00:00.000Z"),
        timeZone: "Europe/Zurich",
      },
    );

    expect(plan.focus).toBe("Die Präsentation entscheidungsreif machen");
    expect(plan.outcomes.map((item) => item.title)).toEqual([
      "Narrativ steht",
      "Zahlen geprüft",
      "Probe gehalten",
    ]);
    expect(plan.backlog[0]).toMatchObject({
      title: "Notizen sortieren",
      status: "open",
      scheduledDate: null,
      completedAt: null,
    });
    expect(() =>
      addWeeklyPlanItem(plan, "outcomes", "Ein Ergebnis zu viel"),
    ).toThrowError(/höchstens drei/);

    expect(() =>
      createWeeklyPlan(
        {
          weekStartDate: "2026-07-20",
          outcomes: ["Eins", "Zwei", "Drei", "Vier"],
        },
        { id: uuid(2), idFactory: idSequence(20) },
      ),
    ).toThrow();
  });

  it("begrenzt auch den Backlog auf 30 Einträge", () => {
    const plan = createWeeklyPlan(
      {
        weekStartDate: "2026-07-20",
        backlog: Array.from({ length: 30 }, (_, index) => `Eintrag ${index + 1}`),
      },
      { id: uuid(50), idFactory: idSequence(100) },
    );

    expect(plan.backlog).toHaveLength(30);
    expect(() => addWeeklyPlanItem(plan, "backlog", "Nummer 31")).toThrowError(
      /höchstens 30/,
    );
  });

  it("ändert den Status eines Eintrags unabhängig von den übrigen", () => {
    const draft = WeeklyPlanSchema.parse({
      ...createWeeklyPlan(
        {
          weekStartDate: "2026-07-20",
          outcomes: ["Ergebnis"],
          backlog: ["Dienstag vorbereiten", "Später prüfen"],
        },
        { id: uuid(200), idFactory: idSequence(201) },
      ),
      backlog: [
        {
          id: uuid(202),
          title: "Dienstag vorbereiten",
          status: "open",
          scheduledDate: null,
          completedAt: null,
        },
        {
          id: uuid(203),
          title: "Später prüfen",
          status: "open",
          scheduledDate: null,
          completedAt: null,
        },
      ],
    });
    const plan = scheduleWeeklyPlanItem(
      draft,
      uuid(202),
      "2026-07-21",
      new Date("2026-07-20T09:00:00.000Z"),
    );
    expect(plan.backlog[0]).toMatchObject({
      status: "scheduled",
      scheduledDate: "2026-07-21",
    });

    const completed = setWeeklyPlanItemCompleted(
      plan,
      uuid(202),
      true,
      new Date("2026-07-21T15:00:00.000Z"),
    );
    expect(completed.backlog[0]).toMatchObject({
      status: "completed",
      scheduledDate: "2026-07-21",
      completedAt: "2026-07-21T15:00:00.000Z",
    });
    expect(completed.backlog[1]).toEqual(plan.backlog[1]);
    expect(completed.outcomes).toEqual(plan.outcomes);

    const reopened = setWeeklyPlanItemCompleted(
      completed,
      uuid(202),
      false,
      new Date("2026-07-21T15:05:00.000Z"),
    );
    expect(reopened.backlog[0]).toMatchObject({
      status: "scheduled",
      scheduledDate: "2026-07-21",
      completedAt: null,
    });
    const unscheduled = scheduleWeeklyPlanItem(
      reopened,
      uuid(202),
      null,
      new Date("2026-07-21T15:10:00.000Z"),
    );
    expect(unscheduled.backlog[0]).toMatchObject({
      status: "open",
      scheduledDate: null,
      completedAt: null,
    });
    expect(() => setWeeklyPlanItemCompleted(plan, uuid(999), true)).toThrowError(
      /gehört nicht/,
    );
  });
});
