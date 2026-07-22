import { describe, expect, it } from "vitest";

import type { DailyPlan } from "./app-store";
import {
  DEFAULT_PLAN_FOCUS_NOTE,
  DEFAULT_PLAN_INTENTION,
  MAX_DAILY_PLAN_BLOCKS,
  MAX_DAILY_PLAN_TASKS,
  SIMPLE_DAY_PLAN_TEMPLATE,
  addPlannerBlock,
  addPlanTask,
  createSimpleDayPlan,
  deletePlannerBlock,
  deletePlanTask,
  formatPlanDate,
  formatPlanTitle,
  movePlanTask,
  movePlannerBlock,
  normalizeSimpleDayPlan,
  orderedPlanTasks,
  tasksForPlannerBlock,
} from "./simple-day-plan";

describe("simpler Block-Tagesplan", () => {
  it("erstellt die sechs Blöcke und alle Aufgaben aus der Standardvorlage", () => {
    const plan = createSimpleDayPlan("2026-07-22", "Europe/Zurich");
    const tasks = orderedPlanTasks(plan);

    expect(plan).toMatchObject({
      date: "2026-07-22",
      intention: DEFAULT_PLAN_INTENTION,
      focusNote: DEFAULT_PLAN_FOCUS_NOTE,
      timezone: "Europe/Zurich",
    });
    expect(plan.plannerBlocks?.map(({ title, note }) => ({ title, note }))).toEqual(
      SIMPLE_DAY_PLAN_TEMPLATE.map((block) => ({
        title: block.title,
        note: "note" in block ? block.note : undefined,
      })),
    );
    expect(tasks.map((task) => task.title)).toEqual(
      SIMPLE_DAY_PLAN_TEMPLATE.flatMap((block) => block.tasks),
    );
    expect(tasks).toHaveLength(19);
    expect(new Set([
      plan.id,
      ...(plan.plannerBlocks ?? []).map((block) => block.id),
      ...tasks.map((task) => task.id),
    ]).size).toBe(26);
  });

  it("formatiert das lokale Datum ohne Zeitzonenverschiebung", () => {
    expect(formatPlanDate("2026-01-02")).toBe("02.01.2026");
    expect(formatPlanTitle("2026-01-02")).toBe("Plan für 02.01.2026");
  });

  it("macht Aufgaben alter Pläne über Morgen, Tag und Abend sichtbar", () => {
    const source = createSimpleDayPlan("2026-07-22");
    const legacy: DailyPlan = {
      ...source,
      plannerBlocks: undefined,
      mainTask: {
        ...source.mainTask,
        plannerBlockId: undefined,
        section: "morning",
        title: "Morgens",
      },
      secondaryTasks: [
        {
          ...source.secondaryTasks[0],
          plannerBlockId: undefined,
          section: "day",
          title: "Tagsüber",
        },
        {
          ...source.secondaryTasks[1],
          plannerBlockId: undefined,
          section: "evening",
          title: "Abends",
        },
      ],
    };

    const normalized = normalizeSimpleDayPlan(legacy);
    expect(normalized.plannerBlocks?.map((block) => block.title)).toEqual([
      "Morgen Block",
      "Tages Block",
      "Abend Block",
    ]);
    expect(
      normalized.plannerBlocks?.map((block) =>
        tasksForPlannerBlock(normalized, block.id).map((task) => task.title),
      ),
    ).toEqual([["Morgens"], ["Tagsüber"], ["Abends"]]);
  });

  it("überschreitet beim Einsortieren verwaister Aufgaben nicht das Blocklimit", () => {
    const source = createSimpleDayPlan("2026-07-22");
    const plannerBlocks = Array.from({ length: MAX_DAILY_PLAN_BLOCKS }, (_, index) => ({
      id: `block-${index}`,
      title: `Block ${index + 1}`,
    }));
    const planAtLimit: DailyPlan = {
      ...source,
      plannerBlocks,
      mainTask: { ...source.mainTask, plannerBlockId: undefined },
    };

    const normalized = normalizeSimpleDayPlan(planAtLimit);
    expect(normalized.plannerBlocks).toHaveLength(MAX_DAILY_PLAN_BLOCKS);
    expect(normalized.mainTask.plannerBlockId).toBe(plannerBlocks.at(-1)?.id);
  });

  it("verschiebt Aufgaben blockübergreifend und erhält ihre sichtbare Reihenfolge", () => {
    const plan = createSimpleDayPlan("2026-07-22");
    const morning = plan.plannerBlocks![0];
    const evening = plan.plannerBlocks![5];
    const moving = tasksForPlannerBlock(plan, morning.id)[1];

    const moved = movePlanTask(plan, moving.id, evening.id, 1);
    expect(tasksForPlannerBlock(moved, morning.id).some((task) => task.id === moving.id)).toBe(false);
    expect(tasksForPlannerBlock(moved, evening.id)[1]).toMatchObject({
      id: moving.id,
      plannerBlockId: evening.id,
      section: "evening",
    });
  });

  it("entfernt den Hauptaufgaben-Schritt nur, wenn eine andere Aufgabe nach vorne rückt", () => {
    const plan = {
      ...createSimpleDayPlan("2026-07-22"),
      nextStep: "Laufschuhe bereitstellen",
    };
    const morning = plan.plannerBlocks![0];
    const first = plan.mainTask;
    const second = plan.secondaryTasks[0];

    const stillFirst = movePlanTask(plan, second.id, morning.id, 2);
    expect(stillFirst.mainTask.id).toBe(first.id);
    expect(stillFirst.nextStep).toBe("Laufschuhe bereitstellen");

    const newFirst = movePlanTask(plan, second.id, morning.id, 0);
    expect(newFirst.mainTask.id).toBe(second.id);
    expect(newFirst.nextStep).toBe("");
  });

  it("fügt Aufgaben im gewählten Block hinzu und löscht niemals die letzte Aufgabe", () => {
    const plan = createSimpleDayPlan("2026-07-22");
    const business = plan.plannerBlocks![2];
    const added = addPlanTask(plan, business.id, "  Angebot senden  ");
    expect(tasksForPlannerBlock(added, business.id).at(-1)).toMatchObject({
      title: "Angebot senden",
      completed: false,
      plannerBlockId: business.id,
    });

    const singleTaskPlan: DailyPlan = {
      ...added,
      mainTask: added.mainTask,
      secondaryTasks: [],
    };
    expect(deletePlanTask(singleTaskPlan, singleTaskPlan.mainTask.id)).toMatchObject({
      mainTask: { id: singleTaskPlan.mainTask.id },
      secondaryTasks: [],
    });
  });

  it("fügt höchstens so viele Aufgaben hinzu, wie dauerhaft gespeichert werden können", () => {
    const source = createSimpleDayPlan("2026-07-22");
    const block = source.plannerBlocks![0];
    const existing = orderedPlanTasks(source);
    const tasksAtLimit = Array.from({ length: MAX_DAILY_PLAN_TASKS }, (_, index) => ({
      ...(existing[index % existing.length] ?? source.mainTask),
      id: `task-${index}`,
      title: `Aufgabe ${index + 1}`,
      plannerBlockId: block.id,
    }));
    const planAtLimit: DailyPlan = {
      ...source,
      mainTask: tasksAtLimit[0],
      secondaryTasks: tasksAtLimit.slice(1),
    };

    const unchanged = addPlanTask(planAtLimit, block.id, "Eine Aufgabe zu viel");
    expect(orderedPlanTasks(unchanged)).toHaveLength(MAX_DAILY_PLAN_TASKS);
    expect(orderedPlanTasks(unchanged).map((task) => task.title)).not.toContain(
      "Eine Aufgabe zu viel",
    );
  });

  it("sortiert Blöcke und verschiebt ihre Aufgaben beim Löschen verlustfrei", () => {
    const plan = createSimpleDayPlan("2026-07-22");
    const first = plan.plannerBlocks![0];
    const last = plan.plannerBlocks!.at(-1)!;
    const moved = movePlannerBlock(plan, first.id, last.id);
    expect(moved.plannerBlocks?.at(-1)?.id).toBe(first.id);
    expect(orderedPlanTasks(moved)).toHaveLength(19);

    const withExtraBlock = addPlannerBlock(moved, "Telefonate", "kurz halten");
    const extra = withExtraBlock.plannerBlocks!.at(-1)!;
    const withExtraTask = addPlanTask(withExtraBlock, extra.id, "Versicherung anrufen");
    const withoutExtraBlock = deletePlannerBlock(withExtraTask, extra.id);
    expect(withoutExtraBlock.plannerBlocks?.some((block) => block.id === extra.id)).toBe(false);
    expect(orderedPlanTasks(withoutExtraBlock).map((task) => task.title)).toContain(
      "Versicherung anrufen",
    );
  });

  it("fügt höchstens so viele Blöcke hinzu, wie dauerhaft gespeichert werden können", () => {
    const source = createSimpleDayPlan("2026-07-22");
    const plannerBlocks = Array.from({ length: MAX_DAILY_PLAN_BLOCKS }, (_, index) => ({
      id: `block-${index}`,
      title: `Block ${index + 1}`,
    }));
    const planAtLimit: DailyPlan = {
      ...source,
      plannerBlocks,
      mainTask: { ...source.mainTask, plannerBlockId: plannerBlocks[0].id },
      secondaryTasks: source.secondaryTasks.map((task) => ({
        ...task,
        plannerBlockId: plannerBlocks[0].id,
      })),
    };

    const unchanged = addPlannerBlock(planAtLimit, "Ein Block zu viel");
    expect(unchanged.plannerBlocks).toHaveLength(MAX_DAILY_PLAN_BLOCKS);
    expect(unchanged.plannerBlocks?.map((block) => block.title)).not.toContain(
      "Ein Block zu viel",
    );
  });
});
