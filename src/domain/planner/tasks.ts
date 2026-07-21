import { DailyTaskSchema, LocalDateSchema, type DailyTask } from "../entities";
import { createEntityMetadata, createNamespacedStableId } from "../factories";

function nextLocalDate(localDate: string): string {
  LocalDateSchema.parse(localDate);
  const [year, month, day] = localDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(
    next.getUTCDate(),
  ).padStart(2, "0")}`;
}

function resetTerminalFields(task: DailyTask) {
  return {
    ...task,
    completedAt: null,
    skippedAt: null,
    deferredAt: null,
    deferredToDate: null,
    deferredToTaskId: null,
  };
}

export function reopenDailyTask(task: DailyTask, now: Date = new Date()): DailyTask {
  return DailyTaskSchema.parse({
    ...resetTerminalFields(task),
    status: "open",
    updatedAt: now.toISOString(),
  });
}

export function completeDailyTask(task: DailyTask, now: Date = new Date()): DailyTask {
  const timestamp = now.toISOString();
  return DailyTaskSchema.parse({
    ...resetTerminalFields(task),
    status: "completed",
    completedAt: timestamp,
    updatedAt: timestamp,
  });
}

export function skipDailyTask(task: DailyTask, now: Date = new Date()): DailyTask {
  const timestamp = now.toISOString();
  return DailyTaskSchema.parse({
    ...resetTerminalFields(task),
    status: "skipped",
    skippedAt: timestamp,
    updatedAt: timestamp,
  });
}

export interface DeferDailyTaskInput {
  task: DailyTask;
  currentLocalDate: string;
  tomorrowPlanId: string;
  tomorrowOrder: number;
  tomorrowRole?: DailyTask["role"];
  now?: Date;
  tomorrowTimeZone?: string;
}

export interface DeferredDailyTaskResult {
  deferredTask: DailyTask;
  tomorrowTask: DailyTask;
}

export function deferDailyTaskToTomorrow(
  input: DeferDailyTaskInput,
): DeferredDailyTaskResult {
  const source = DailyTaskSchema.parse(input.task);
  const targetDate = nextLocalDate(input.currentLocalDate);
  const now = input.now ?? new Date();
  const tomorrowTaskId = createNamespacedStableId(
    "deferred-daily-task",
    `${source.id}|${targetDate}|${input.tomorrowPlanId}`,
  );
  const deferredTask = DailyTaskSchema.parse({
    ...resetTerminalFields(source),
    status: "deferred",
    deferredAt: now.toISOString(),
    deferredToDate: targetDate,
    deferredToTaskId: tomorrowTaskId,
    updatedAt: now.toISOString(),
  });
  const tomorrowTask = DailyTaskSchema.parse({
    ...createEntityMetadata({
      id: tomorrowTaskId,
      now,
      timeZone: input.tomorrowTimeZone ?? source.timeZone,
    }),
    dailyPlanId: input.tomorrowPlanId,
    role: input.tomorrowRole ?? "secondary",
    title: source.title,
    nextStep: source.nextStep,
    order: input.tomorrowOrder,
    daySegment: source.daySegment,
    scheduledTime: source.scheduledTime,
    status: "open",
    startedAt: null,
    completedAt: null,
    skippedAt: null,
    deferredAt: null,
    deferredToDate: null,
    deferredToTaskId: null,
    carriedFromTaskId: source.carriedFromTaskId ?? source.id,
  });
  return { deferredTask, tomorrowTask };
}
