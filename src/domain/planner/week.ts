import {
  LocalDateSchema,
  WeeklyPlanSchema,
  type WeeklyPlan,
  type WeeklyPlanItem,
} from "../entities";
import { createEntityMetadata, createStableId } from "../factories";

export interface CreateWeeklyPlanInput {
  weekStartDate: string;
  focus?: string | null;
  outcomes?: string[];
  backlog?: string[];
}

export function createWeeklyPlan(
  input: CreateWeeklyPlanInput,
  options: { id?: string; now?: Date; timeZone?: string; idFactory?: () => string } = {},
): WeeklyPlan {
  const idFactory = options.idFactory ?? createStableId;
  const item = (title: string): WeeklyPlanItem => ({
    id: idFactory(),
    title,
    status: "open",
    scheduledDate: null,
    completedAt: null,
  });
  return WeeklyPlanSchema.parse({
    ...createEntityMetadata(options),
    weekStartDate: input.weekStartDate,
    focus: input.focus ?? null,
    outcomes: (input.outcomes ?? []).map(item),
    backlog: (input.backlog ?? []).map(item),
  });
}

export function addWeeklyPlanItem(
  plan: WeeklyPlan,
  list: "outcomes" | "backlog",
  title: string,
  options: { id?: string; now?: Date } = {},
): WeeklyPlan {
  const parsed = WeeklyPlanSchema.parse(plan);
  const limit = list === "outcomes" ? 3 : 30;
  if (parsed[list].length >= limit) {
    throw new RangeError(
      list === "outcomes"
        ? "Ein Wochenplan enthält höchstens drei Ergebnisse."
        : "Der Wochen-Backlog enthält höchstens 30 Einträge.",
    );
  }
  const now = options.now ?? new Date();
  return WeeklyPlanSchema.parse({
    ...parsed,
    updatedAt: now.toISOString(),
    [list]: [
      ...parsed[list],
      {
        id: options.id ?? createStableId(),
        title,
        status: "open",
        scheduledDate: null,
        completedAt: null,
      },
    ],
  });
}

export function setWeeklyPlanItemCompleted(
  plan: WeeklyPlan,
  itemId: string,
  completed: boolean,
  now: Date = new Date(),
): WeeklyPlan {
  const parsed = WeeklyPlanSchema.parse(plan);
  const exists = [...parsed.outcomes, ...parsed.backlog].some((item) => item.id === itemId);
  if (!exists) throw new RangeError("Der Eintrag gehört nicht zu diesem Wochenplan.");
  const timestamp = now.toISOString();
  const update = (items: WeeklyPlanItem[]) =>
    items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            status: completed ? "completed" : item.scheduledDate ? "scheduled" : "open",
            completedAt: completed ? timestamp : null,
          }
        : item,
    );
  return WeeklyPlanSchema.parse({
    ...parsed,
    updatedAt: timestamp,
    outcomes: update(parsed.outcomes),
    backlog: update(parsed.backlog),
  });
}

export function scheduleWeeklyPlanItem(
  plan: WeeklyPlan,
  itemId: string,
  scheduledDate: string | null,
  now: Date = new Date(),
): WeeklyPlan {
  const parsed = WeeklyPlanSchema.parse(plan);
  if (scheduledDate !== null) LocalDateSchema.parse(scheduledDate);
  const exists = [...parsed.outcomes, ...parsed.backlog].some((item) => item.id === itemId);
  if (!exists) throw new RangeError("Der Eintrag gehört nicht zu diesem Wochenplan.");
  const timestamp = now.toISOString();
  const update = (items: WeeklyPlanItem[]) =>
    items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            status: scheduledDate === null ? "open" : "scheduled",
            scheduledDate,
            completedAt: null,
          }
        : item,
    );
  return WeeklyPlanSchema.parse({
    ...parsed,
    updatedAt: timestamp,
    outcomes: update(parsed.outcomes),
    backlog: update(parsed.backlog),
  });
}
