import {
  LocalDateSchema,
  RoutineInstanceSchema,
  RoutineSchema,
  type DaySegment,
  type Routine,
  type RoutineInstance,
} from "../entities";
import {
  createEntityMetadata,
  createNamespacedStableId,
  createStableId,
} from "../factories";

export interface CreateRoutineInput {
  title: string;
  weekdays: number[];
  daySegment: DaySegment;
  scheduledTime?: string | null;
  steps: string[];
}

export interface PlannerFactoryOptions {
  id?: string;
  now?: Date;
  timeZone?: string;
  idFactory?: () => string;
}

export function createRoutine(
  input: CreateRoutineInput,
  options: PlannerFactoryOptions = {},
): Routine {
  const idFactory = options.idFactory ?? createStableId;
  return RoutineSchema.parse({
    ...createEntityMetadata(options),
    title: input.title,
    weekdays: [...input.weekdays].sort((left, right) => left - right),
    daySegment: input.daySegment,
    scheduledTime: input.scheduledTime ?? null,
    steps: input.steps.map((label, order) => ({ id: idFactory(), label, order })),
    active: true,
    archivedAt: null,
  });
}

function weekdayForLocalDate(localDate: string): number {
  LocalDateSchema.parse(localDate);
  const [year, month, day] = localDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

const daySegmentOrder: Record<DaySegment, number> = {
  morning: 0,
  day: 1,
  evening: 2,
};

export interface MaterializeRoutineDayInput {
  routines: readonly Routine[];
  existingInstances: readonly RoutineInstance[];
  localDate: string;
  timeZone: string;
  now?: Date;
}

/**
 * Materializes only missing routine instances. Snapshot labels and ordering
 * deliberately remain unchanged when the reusable template is edited later.
 */
export function materializeRoutineDay(input: MaterializeRoutineDayInput): RoutineInstance[] {
  const now = input.now ?? new Date();
  const weekday = weekdayForLocalDate(input.localDate);
  const existingKeys = new Set(
    input.existingInstances
      .filter(
        (instance) =>
          instance.localDate === input.localDate && instance.timeZone === input.timeZone,
      )
      .map((instance) => instance.routineId),
  );

  return input.routines
    .filter(
      (routine) =>
        routine.active &&
        routine.archivedAt === null &&
        routine.weekdays.includes(weekday) &&
        !existingKeys.has(routine.id),
    )
    .map((routine) => {
      const instanceId = createNamespacedStableId(
        "routine-instance",
        `${routine.id}|${input.localDate}|${input.timeZone}`,
      );
      return RoutineInstanceSchema.parse({
        ...createEntityMetadata({ id: instanceId, now, timeZone: input.timeZone }),
        routineId: routine.id,
        localDate: input.localDate,
        routineTitle: routine.title,
        daySegment: routine.daySegment,
        scheduledTime: routine.scheduledTime,
        sourceRoutineUpdatedAt: routine.updatedAt,
        steps: [...routine.steps]
          .sort((left, right) => left.order - right.order)
          .map((step) => ({
            id: createNamespacedStableId(
              "routine-instance-step",
              `${instanceId}|${step.id}`,
            ),
            routineStepId: step.id,
            label: step.label,
            order: step.order,
            completedAt: null,
          })),
        status: "open",
        completedAt: null,
        skippedAt: null,
      });
    })
    .sort(
      (left, right) =>
        daySegmentOrder[left.daySegment] - daySegmentOrder[right.daySegment] ||
        (left.scheduledTime ?? "99:99").localeCompare(right.scheduledTime ?? "99:99") ||
        left.routineTitle.localeCompare(right.routineTitle),
    );
}

export function setRoutineStepCompleted(
  instance: RoutineInstance,
  stepInstanceId: string,
  completed: boolean,
  now: Date = new Date(),
): RoutineInstance {
  const parsed = RoutineInstanceSchema.parse(instance);
  if (!parsed.steps.some((step) => step.id === stepInstanceId)) {
    throw new RangeError("Der Routine-Schritt gehört nicht zu dieser Tagesinstanz.");
  }
  const timestamp = now.toISOString();
  const steps = parsed.steps.map((step) =>
    step.id === stepInstanceId
      ? { ...step, completedAt: completed ? timestamp : null }
      : step,
  );
  const allCompleted = steps.every((step) => step.completedAt !== null);
  return RoutineInstanceSchema.parse({
    ...parsed,
    updatedAt: timestamp,
    steps,
    status: allCompleted ? "completed" : "open",
    completedAt: allCompleted ? timestamp : null,
    skippedAt: null,
  });
}

export function skipRoutineInstance(
  instance: RoutineInstance,
  now: Date = new Date(),
): RoutineInstance {
  const parsed = RoutineInstanceSchema.parse(instance);
  const timestamp = now.toISOString();
  return RoutineInstanceSchema.parse({
    ...parsed,
    status: "skipped",
    skippedAt: timestamp,
    completedAt: null,
    updatedAt: timestamp,
  });
}

export function routineInstanceProgress(instance: RoutineInstance): {
  completed: number;
  total: number;
  allCompleted: boolean;
} {
  const parsed = RoutineInstanceSchema.parse(instance);
  const completed = parsed.steps.filter((step) => step.completedAt !== null).length;
  return {
    completed,
    total: parsed.steps.length,
    allCompleted: completed === parsed.steps.length,
  };
}
