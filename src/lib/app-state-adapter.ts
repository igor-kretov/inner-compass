import {
  AppSettingsSchema,
  DailyPlanSchema,
  DailyReflectionSchema,
  DailyTaskSchema,
  DataStoreSchema,
  EmergencyContactSchema,
  FocusSessionSchema,
  MeditationSessionSchema,
  OnboardingStateSchema,
  PatternEntrySchema,
  ResetSessionSchema,
  RoutineInstanceSchema,
  RoutineSchema,
  StableIdSchema,
  WeeklyPlanSchema,
  WeeklyReviewSchema,
  emptyDataStore,
  type AppSettings as DomainSettings,
  type DataStore,
  type PatternEntry as DomainPatternEntry,
  type Routine as DomainRoutine,
  type RoutineInstance as DomainRoutineInstance,
  type WeeklyPlan as DomainWeeklyPlan,
} from "@/domain/entities";
import { createNamespacedStableId, systemTimeZone } from "@/domain/factories";
import { sessionLocalDate } from "@/lib/dates";

import type {
  AppSettings as UiSettings,
  AppState,
  DailyPlan as UiDailyPlan,
  FocusSession as UiFocusSession,
  MeditationSession as UiMeditationSession,
  PatternEntry as UiPatternEntry,
  ResetSession as UiResetSession,
  RoutineInstance as UiRoutineInstance,
  RoutineTemplate as UiRoutine,
  Task as UiTask,
  WeekPlan as UiWeekPlan,
  WeeklyReview as UiWeeklyReview,
} from "./app-store";

type ZonedUi<T> = T & { timezone?: string };
type PlannerUiTask = UiTask & { deferredToTaskId?: string };
type PlannerUiWeekPlan = UiWeekPlan & { outcomeIds?: string[] };

const SETTINGS_ID = "00000000-0000-4000-8000-000000000001";
const ONBOARDING_ID = "00000000-0000-4000-8000-000000000002";
const EMERGENCY_CONTACT_ID = "00000000-0000-4000-8000-000000000003";
const UI_SCHEMA_VERSION = 2;

const UI_TO_ANCHOR = {
  Körper: "body",
  Arbeit: "work",
  Ruhe: "rest",
  Beziehungen: "relationships",
  Mut: "courage",
  Ordnung: "order",
  Kreativität: "creativity",
  Spiritualität: "spirituality",
} as const;
const ANCHOR_TO_UI = Object.fromEntries(
  Object.entries(UI_TO_ANCHOR).map(([ui, domain]) => [domain, ui]),
) as Record<DomainSettings["anchors"][number], string>;

const FOCUS_BODY_TO_DOMAIN = {
  Wasser: "water",
  Bewegen: "move",
  Essen: "eat",
  Toilette: "toilet",
  "Blick in die Ferne": "distance",
  "Nichts nötig": "nothing",
} as const;
const FOCUS_BODY_TO_UI = reverseMap(FOCUS_BODY_TO_DOMAIN);

const MEDITATION_FOCUS_TO_DOMAIN = {
  Atem: "breath",
  Körper: "body",
  Geräusche: "sounds",
  "Gedanken beobachten": "thoughts",
  "Offene Präsenz": "open",
  Ausrichtung: "identity-rehearsal",
} as const;
const MEDITATION_FOCUS_TO_UI = reverseMap(MEDITATION_FOCUS_TO_DOMAIN);

const RESET_KIND_TO_DOMAIN = {
  "Ein reales Problem": "real-problem",
  "Eine Entscheidung": "decision",
  "Eine Emotion": "emotion",
  "Ein wiederkehrendes Szenario": "recurring-scenario",
  "Ich weiß es nicht": "unknown",
} as const;
const RESET_KIND_TO_UI = reverseMap(RESET_KIND_TO_DOMAIN);

const RESET_LATER_TO_DOMAIN = {
  "Heute Abend": "tonight",
  Morgen: "tomorrow",
  "Im nächsten Wochenreview": "weekly-review",
  "Nicht erneut einplanen": "do-not-schedule",
} as const;
const RESET_LATER_TO_UI = reverseMap(RESET_LATER_TO_DOMAIN);

const RESET_UNCLEAR_TO_DOMAIN = {
  "Information beschaffen": "get-information",
  "Entscheidung vertagen": "defer-decision",
  "Thema loslassen": "let-go",
} as const;
const RESET_UNCLEAR_TO_UI = reverseMap(RESET_UNCLEAR_TO_DOMAIN);

const BODY_RESET_TO_DOMAIN = {
  "10 ruhige Atemzüge": "ten-breaths",
  "2 Minuten gehen": "walk-two-minutes",
  "20 Kniebeugen": "twenty-squats",
  "Wasser trinken": "drink-water",
  "Gesicht mit kaltem Wasser waschen": "cold-water",
  "Schultern und Kiefer entspannen": "relax-shoulders-jaw",
  "60 Sekunden den Raum beobachten": "observe-room",
} as const;
const BODY_RESET_TO_UI = reverseMap(BODY_RESET_TO_DOMAIN);

const RETURN_TO_DOMAIN = {
  Hauptaufgabe: "primary-task",
  "Nächste Tagesaufgabe": "next-task",
  Training: "training",
  "Soziale Handlung": "social-action",
  Erholung: "rest",
} as const;
const RETURN_TO_UI = reverseMap(RETURN_TO_DOMAIN);

const TRIGGER_TO_DOMAIN = {
  Arbeit: "work",
  Beziehung: "relationship",
  Eifersucht: "jealousy",
  Leistungsdruck: "performance-pressure",
  Einsamkeit: "loneliness",
  Müdigkeit: "fatigue",
  Konsum: "consumption",
  "Soziale Situation": "social-situation",
  Unordnung: "disorder",
  Unbekannt: "unknown",
} as const;
const TRIGGER_TO_UI = reverseMap(TRIGGER_TO_DOMAIN);

const BODY_STATE_TO_DOMAIN = {
  Angespannt: "tense",
  Unruhig: "restless",
  Erschöpft: "exhausted",
  Aktiviert: "activated",
  Ruhig: "calm",
  Schwer: "heavy",
  Neutral: "neutral",
} as const;
const BODY_STATE_TO_UI = reverseMap(BODY_STATE_TO_DOMAIN);

const PATTERN_ACTION_TO_DOMAIN = {
  Weitergedacht: "kept-thinking",
  "Gespräch gesucht": "sought-conversation",
  "Aufgabe begonnen": "started-task",
  Meditiert: "meditated",
  Trainiert: "trained",
  "Spazieren gegangen": "walked",
  Konsumiert: "consumed",
  Geschlafen: "slept",
  "Bewusst losgelassen": "let-go",
  Andere: "other",
} as const;
const PATTERN_ACTION_TO_UI = reverseMap(PATTERN_ACTION_TO_DOMAIN);

function reverseMap<T extends Record<string, string>>(source: T): Record<T[keyof T], keyof T> {
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [value, key])) as Record<
    T[keyof T],
    keyof T
  >;
}

function dictionaryValue<T extends string>(
  dictionary: Readonly<Record<string, T>>,
  key: string | undefined,
): T | undefined {
  return key === undefined ? undefined : dictionary[key];
}

function stableId(value: string, namespace: string): string {
  return StableIdSchema.safeParse(value).success
    ? value
    : createNamespacedStableId(namespace, value);
}

function nullableStableId(value: string | undefined, namespace: string): string | null {
  return value ? stableId(value, namespace) : null;
}

function validTimestamp(value: string | undefined, fallback: string): string {
  if (!value || Number.isNaN(new Date(value).getTime())) return fallback;
  return new Date(value).toISOString();
}

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function latestMovementCategories(categories: readonly string[]): string[] {
  const unique = new Map<string, string>();
  for (let index = categories.length - 1; index >= 0; index -= 1) {
    const category = categories[index].trim();
    if (!category) continue;
    const key = category.toLocaleLowerCase();
    if (!unique.has(key)) unique.set(key, category);
  }
  return [...unique.values()].reverse().slice(-30);
}

function adapterTimeZone(value: string): string {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return value;
  } catch {
    return systemTimeZone();
  }
}

function recordTimeZone(record: object, fallback: string): string {
  return adapterTimeZone((record as { timezone?: string }).timezone ?? fallback);
}

function metadata(
  id: string,
  createdAt: string,
  updatedAt: string,
  timeZone: string,
) {
  const safeUpdatedAt = validTimestamp(updatedAt, new Date().toISOString());
  return {
    id,
    createdAt: validTimestamp(createdAt, safeUpdatedAt),
    updatedAt: safeUpdatedAt,
    timeZone,
    schemaVersion: 2 as const,
  };
}

function startedAtForTask(state: AppState, taskId: string): string | null {
  const starts = state.focusSessions
    .filter((session) => session.taskId === taskId)
    .map((session) => session.startedAt)
    .sort();
  return starts[0] ?? null;
}

function uiTaskStatus(task: UiTask): DataStore["dailyTasks"][number]["status"] {
  if (task.completed || task.status === "completed") return "completed";
  return task.status ?? "open";
}

function planToDomain(
  state: AppState,
  plan: ZonedUi<UiDailyPlan>,
  fallbackTimeZone: string,
  data: DataStore,
): void {
  const timeZone = recordTimeZone(plan, fallbackTimeZone);
  const planId = stableId(plan.id, "daily-plan");
  const primaryId = stableId(plan.mainTask.id, "daily-task");
  const secondaryIds = plan.secondaryTasks.map((task) => stableId(task.id, "daily-task"));
  const plannerBlockIds = new Map(
    (plan.plannerBlocks ?? []).map((block) => [
      block.id,
      stableId(block.id, "daily-plan-block"),
    ]),
  );
  const domainPlannerBlockId = (id: string) =>
    plannerBlockIds.get(id) ?? stableId(id, "daily-plan-block");
  const plannerBlockId = (task: UiTask) =>
    task.plannerBlockId
      ? domainPlannerBlockId(task.plannerBlockId)
      : null;
  const primaryStatus = uiTaskStatus(plan.mainTask);
  data.dailyPlans.push(
    DailyPlanSchema.parse({
      ...metadata(planId, plan.createdAt, plan.updatedAt, timeZone),
      localDate: plan.date,
      status: plan.reflection ? "closed" : "planned",
      intention: optional(plan.intention) ?? null,
      focusNote: optional(plan.focusNote) ?? null,
      plannerBlocks: (plan.plannerBlocks ?? []).map((block) => ({
        id: domainPlannerBlockId(block.id),
        title: block.title,
        note: optional(block.note) ?? null,
      })),
      energy: plan.energy ?? null,
      mentalRestlessness: plan.mentalState ?? null,
      primaryTaskId: primaryId,
      secondaryTaskIds: secondaryIds,
      bodyActivity: optional(plan.bodyActivity),
      bodyCompletedAt: plan.bodyCompleted ? plan.bodyCompletedAt ?? plan.updatedAt : null,
      meditationPlan: plan.meditationSkipped
        ? "not-planned"
        : [5, 10, 20].includes(plan.meditationMinutes ?? -1)
          ? plan.meditationMinutes
          : null,
      meditationCompletedAt: plan.meditationCompleted
        ? plan.meditationCompletedAt ?? plan.updatedAt
        : null,
      courageousAction: optional(plan.courageousAction),
      courageousActionCompletedAt: plan.courageousCompleted
        ? plan.courageousCompletedAt ?? plan.updatedAt
        : null,
      primaryStartTime: plan.startTime ?? null,
      plannedAt: plan.createdAt,
    }),
  );

  data.dailyTasks.push(
    DailyTaskSchema.parse({
      ...metadata(primaryId, plan.createdAt, plan.updatedAt, timeZone),
      dailyPlanId: planId,
      role: "primary",
      title: plan.mainTask.title,
      plannerBlockId: plannerBlockId(plan.mainTask),
      nextStep: optional(plan.nextStep),
      order: 0,
      daySegment: plan.mainTask.section ?? "day",
      scheduledTime: plan.mainTask.plannedTime ?? plan.startTime ?? null,
      status: primaryStatus,
      startedAt: startedAtForTask(state, plan.mainTask.id),
      completedAt: primaryStatus === "completed"
        ? plan.mainTask.completedAt ?? plan.updatedAt
        : null,
      skippedAt:
        primaryStatus === "skipped"
          ? plan.mainTask.skippedAt ?? plan.updatedAt
          : null,
      deferredAt:
        primaryStatus === "deferred"
          ? plan.mainTask.deferredAt ?? plan.updatedAt
          : null,
      deferredToDate: primaryStatus === "deferred" ? plan.mainTask.deferredTo ?? null : null,
      deferredToTaskId:
        primaryStatus === "deferred"
          ? nullableStableId(
              (plan.mainTask as PlannerUiTask).deferredToTaskId,
              "daily-task",
            )
          : null,
      carriedFromTaskId: nullableStableId(plan.mainTask.originTaskId, "daily-task"),
    }),
    ...plan.secondaryTasks.map((task, index) => {
      const status = uiTaskStatus(task);
      return DailyTaskSchema.parse({
        ...metadata(
          stableId(task.id, "daily-task"),
          plan.createdAt,
          task.completedAt ?? plan.updatedAt,
          timeZone,
        ),
        dailyPlanId: planId,
        role: "secondary",
        title: task.title,
        plannerBlockId: plannerBlockId(task),
        order: index + 1,
        daySegment: task.section ?? "day",
        scheduledTime: task.plannedTime ?? null,
        status,
        startedAt: startedAtForTask(state, task.id),
        completedAt: status === "completed" ? task.completedAt ?? plan.updatedAt : null,
        skippedAt: status === "skipped" ? task.skippedAt ?? plan.updatedAt : null,
        deferredAt: status === "deferred" ? task.deferredAt ?? plan.updatedAt : null,
        deferredToDate: status === "deferred" ? task.deferredTo ?? null : null,
        deferredToTaskId:
          status === "deferred"
            ? nullableStableId(
                (task as PlannerUiTask).deferredToTaskId,
                "daily-task",
              )
            : null,
        carriedFromTaskId: nullableStableId(task.originTaskId, "daily-task"),
      });
    }),
  );

  if (plan.reflection) {
    data.dailyReflections.push(
      DailyReflectionSchema.parse({
        ...metadata(
          createNamespacedStableId("daily-reflection", planId),
          plan.reflection.completedAt,
          plan.updatedAt,
          timeZone,
        ),
        localDate: plan.date,
        whatMattered: optional(plan.reflection.important),
        leaveBehind: optional(plan.reflection.leaveBehind),
        note: optional(plan.reflection.note),
        identityEvidence: optional(plan.reflection.identityEvidence),
      }),
    );
  }
}

function focusToDomain(session: ZonedUi<UiFocusSession>, fallbackTimeZone: string) {
  const timeZone = recordTimeZone(session, fallbackTimeZone);
  const id = stableId(session.id, "focus-session");
  return FocusSessionSchema.parse({
    ...metadata(id, session.createdAt, session.updatedAt, timeZone),
    localDate: sessionLocalDate(session.startedAt, timeZone),
    taskId: session.taskId ? stableId(session.taskId, "daily-task") : null,
    taskLabel: session.task,
    intendedOutcome: session.expectedOutcome,
    status: session.status,
    plannedDurationSeconds: session.durationMinutes * 60,
    startedAt: session.startedAt,
    plannedEndAt: session.plannedEndAt,
    pausedAt: session.pausedAt ?? null,
    accumulatedPausedMs: session.totalPausedMs,
    endedAt: session.endedAt ?? null,
    outcome: session.result ?? null,
    nextStep: optional(session.nextStep),
    bodyCheck: dictionaryValue(FOCUS_BODY_TO_DOMAIN, session.bodyCheck) ?? null,
    driftEvents: session.driftStep
      ? [
          {
            noticedAt: session.updatedAt,
            timerAction: session.status === "paused" ? "paused" : "continued",
            smallestNextStep: session.driftStep,
          },
        ]
      : [],
  });
}

function meditationToDomain(
  session: ZonedUi<UiMeditationSession>,
  fallbackTimeZone: string,
) {
  const timeZone = recordTimeZone(session, fallbackTimeZone);
  return MeditationSessionSchema.parse({
    ...metadata(
      stableId(session.id, "meditation-session"),
      session.createdAt,
      session.updatedAt,
      timeZone,
    ),
    localDate: sessionLocalDate(session.startedAt, timeZone),
    focus: dictionaryValue(MEDITATION_FOCUS_TO_DOMAIN, session.focus) ?? null,
    status: session.status,
    plannedDurationSeconds: session.durationMinutes * 60,
    startedAt: session.startedAt,
    plannedEndAt: session.plannedEndAt,
    pausedAt: session.pausedAt ?? null,
    accumulatedPausedMs: session.totalPausedMs,
    endedAt: session.endedAt ?? null,
    presenceAfter:
      session.presence === "skip" ? "not-rated" : session.presence ?? null,
    note: optional(session.note),
  });
}

function resetToDomain(session: ZonedUi<UiResetSession>, fallbackTimeZone: string) {
  const timeZone = recordTimeZone(session, fallbackTimeZone);
  const returnTo = dictionaryValue(RETURN_TO_DOMAIN, session.returnTo) ?? "custom";
  return ResetSessionSchema.parse({
    ...metadata(
      stableId(session.id, "reset-session"),
      session.createdAt,
      session.updatedAt,
      timeZone,
    ),
    localDate: sessionLocalDate(session.createdAt, timeZone),
    thought: session.thought,
    thoughtType: dictionaryValue(RESET_KIND_TO_DOMAIN, session.kind) ?? "unknown",
    actionNeeded: session.actionNeeded,
    responsibleAction: optional(session.responsibleAction),
    reflectionTime: dictionaryValue(RESET_LATER_TO_DOMAIN, session.later) ?? null,
    missingInformation: optional(session.missingInformation),
    unclearResolution: dictionaryValue(RESET_UNCLEAR_TO_DOMAIN, session.unclearDecision) ?? null,
    bodyResets: [dictionaryValue(BODY_RESET_TO_DOMAIN, session.bodyReset) ?? "observe-room"],
    returnTo,
    customReturn: returnTo === "custom" ? session.returnTo : undefined,
    createdTask: session.createdTask,
    completedAt: session.updatedAt,
  });
}

function reviewToDomain(review: ZonedUi<UiWeeklyReview>, fallbackTimeZone: string) {
  const timeZone = recordTimeZone(review, fallbackTimeZone);
  return WeeklyReviewSchema.parse({
    ...metadata(
      stableId(review.id, "weekly-review"),
      review.createdAt,
      review.updatedAt,
      timeZone,
    ),
    weekStartDate: review.weekKey,
    completedAt: review.updatedAt,
    answers: {
      progress: optional(review.answers[0]) ? [review.answers[0].trim()] : [],
      avoided: optional(review.answers[1]),
      madeTooLarge: optional(review.answers[2]),
      helpfulStructure: optional(review.answers[3]),
      hyperfocusOrLoops: optional(review.answers[4]),
      bodySupport: optional(review.answers[5]),
      emotionalPresence: optional(review.answers[6]),
      additionalAnswers: review.answers.slice(7, 10),
    },
    nextWeekGoal: optional(review.weeklyGoal),
    supportingOutcomes: review.outcomes.slice(0, 3),
    plannedMovement: optional(review.movement),
    meditationIntention: optional(review.meditationIntention),
    consciouslyOmitted: optional(review.omit),
  });
}

function patternToDomain(entry: ZonedUi<UiPatternEntry>, fallbackTimeZone: string) {
  const timeZone = recordTimeZone(entry, fallbackTimeZone);
  const trigger = dictionaryValue(TRIGGER_TO_DOMAIN, entry.trigger) ?? "custom";
  return PatternEntrySchema.parse({
    ...metadata(
      stableId(entry.id, "pattern-entry"),
      entry.createdAt,
      entry.updatedAt,
      timeZone,
    ),
    localDate: sessionLocalDate(entry.createdAt, timeZone),
    occurredAt: entry.createdAt,
    trigger,
    customTrigger: trigger === "custom" ? entry.trigger : undefined,
    bodyState: dictionaryValue(BODY_STATE_TO_DOMAIN, entry.bodyState) ?? "neutral",
    dominantThought: optional(entry.thought),
    impulse: optional(entry.impulse),
    chosenAction: dictionaryValue(PATTERN_ACTION_TO_DOMAIN, entry.action) ?? "other",
    stateAfter: entry.after === "better" ? "somewhat-better" : entry.after,
  });
}

function routineToDomain(routine: ZonedUi<UiRoutine>, fallbackTimeZone: string) {
  const timeZone = recordTimeZone(routine, fallbackTimeZone);
  return RoutineSchema.parse({
    ...metadata(
      stableId(routine.id, "routine"),
      routine.createdAt,
      routine.updatedAt,
      timeZone,
    ),
    title: routine.title,
    weekdays: routine.weekdays,
    daySegment: routine.section,
    scheduledTime: routine.time ?? null,
    steps: routine.steps.map((step, order) => ({
      id: stableId(step.id, "routine-step"),
      label: step.title,
      order,
    })),
    active: routine.enabled,
    archivedAt: null,
  });
}

function routineInstanceToDomain(
  instance: ZonedUi<UiRoutineInstance>,
  routines: readonly UiRoutine[],
  fallbackTimeZone: string,
) {
  const timeZone = recordTimeZone(instance, fallbackTimeZone);
  const allCompleted = instance.steps.every((step) => step.completed);
  const skipped = instance.status === "skipped";
  const completedAt = allCompleted
    ? instance.steps.map((step) => step.completedAt).filter(Boolean).sort().at(-1) ?? instance.updatedAt
    : null;
  const sourceRoutine = routines.find((routine) => routine.id === instance.routineId);
  return RoutineInstanceSchema.parse({
    ...metadata(
      stableId(instance.id, "routine-instance"),
      instance.createdAt,
      instance.updatedAt,
      timeZone,
    ),
    routineId: stableId(instance.routineId, "routine"),
    localDate: instance.date,
    routineTitle: instance.title,
    daySegment: instance.section,
    scheduledTime: instance.time ?? null,
    sourceRoutineUpdatedAt: sourceRoutine?.updatedAt ?? instance.updatedAt,
    steps: instance.steps.map((step, order) => ({
      id: stableId(step.id, "routine-instance-step"),
      routineStepId: stableId(step.sourceStepId, "routine-step"),
      label: step.title,
      order,
      completedAt: step.completed ? step.completedAt ?? instance.updatedAt : null,
    })),
    status: skipped ? "skipped" : allCompleted ? "completed" : "open",
    completedAt: skipped ? null : completedAt,
    skippedAt: skipped ? instance.skippedAt ?? instance.updatedAt : null,
  });
}

function weekPlanToDomain(plan: ZonedUi<PlannerUiWeekPlan>, fallbackTimeZone: string) {
  const timeZone = recordTimeZone(plan, fallbackTimeZone);
  return WeeklyPlanSchema.parse({
    ...metadata(
      stableId(plan.id, "week-plan"),
      plan.createdAt,
      plan.updatedAt,
      timeZone,
    ),
    weekStartDate: plan.weekKey,
    focus: optional(plan.focus) ?? null,
    outcomes: plan.outcomes.map((title, index) => ({
      id:
        nullableStableId(plan.outcomeIds?.[index], "week-plan-outcome") ??
        createNamespacedStableId("week-plan-outcome", `${plan.id}|${index}|${title}`),
      title,
      status: "open",
      scheduledDate: null,
      completedAt: null,
    })),
    backlog: plan.backlog.map((item) => ({
      id: stableId(item.id, "week-plan-backlog"),
      title: item.title,
      status: item.status,
      scheduledDate: item.scheduledDate ?? null,
      completedAt: item.status === "completed" ? item.completedAt ?? plan.updatedAt : null,
    })),
  });
}

/** Converts the current UI aggregate into the normalized, fully validated store. */
export function appStateToDataStore(state: AppState): DataStore {
  const data = emptyDataStore();
  const timeZone = adapterTimeZone(state.settings.timezone);
  const singletonCreatedAt = [
    ...state.plans,
    ...state.focusSessions,
    ...state.meditationSessions,
    ...state.resetSessions,
    ...state.weeklyReviews,
    ...state.patternEntries,
    ...state.routines,
    ...state.routineInstances,
    ...state.weekPlans,
  ]
    .map((entity) => entity.createdAt)
    .sort()[0] ?? state.updatedAt;
  const baseMetadata = metadata(SETTINGS_ID, singletonCreatedAt, state.updatedAt, timeZone);
  const emergencyExists = Boolean(state.settings.emergencyPhone.trim());

  data.appSettings.push(
    AppSettingsSchema.parse({
      ...baseMetadata,
      displayName: optional(state.settings.name),
      approximateDayStart: state.settings.dayStart,
      preferredMeditationTime: state.settings.meditationTime,
      preferredTrainingTime: state.settings.trainingTime,
      weeklyReviewDay: Number(state.settings.reviewDay),
      weeklyReviewTime: state.settings.reviewTime,
      defaultFocusMinutes: state.settings.focusDuration,
      theme: state.settings.theme,
      timerSoundEnabled: state.settings.sounds,
      hapticFeedbackEnabled: state.settings.haptics,
      anchors: state.settings.anchors
        .map((anchor) => dictionaryValue(UI_TO_ANCHOR, anchor))
        .filter((anchor): anchor is NonNullable<typeof anchor> => anchor !== undefined)
        .slice(0, 3),
      movementCategories: latestMovementCategories(state.settings.movementCategories),
      identityPractice: state.settings.identity
        ? {
            statement: state.settings.identity.statement,
            action: optional(state.settings.identity.action),
            startedAt: state.settings.identity.startedAt,
            reframe: optional(state.settings.identity.reframe),
            rehearsalDates: [...new Set(state.settings.identity.rehearsalDates)]
              .sort()
              .slice(-366),
          }
        : null,
      emergencyContactId: emergencyExists ? EMERGENCY_CONTACT_ID : null,
    }),
  );
  data.onboardingStates.push(
    OnboardingStateSchema.parse({
      ...metadata(ONBOARDING_ID, singletonCreatedAt, state.updatedAt, timeZone),
      currentStep: state.onboardingComplete ? 4 : 1,
      completed: state.onboardingComplete,
      completedAt: state.onboardingComplete ? state.updatedAt : null,
    }),
  );
  if (emergencyExists) {
    data.emergencyContacts.push(
      EmergencyContactSchema.parse({
        ...metadata(EMERGENCY_CONTACT_ID, singletonCreatedAt, state.updatedAt, timeZone),
        name: optional(state.settings.emergencyName) ?? "Persönlicher Notfallkontakt",
        contact: optional(state.settings.emergencyPhone),
      }),
    );
  }

  for (const plan of state.plans) planToDomain(state, plan, timeZone, data);
  data.focusSessions.push(...state.focusSessions.map((session) => focusToDomain(session, timeZone)));
  data.meditationSessions.push(
    ...state.meditationSessions.map((session) => meditationToDomain(session, timeZone)),
  );
  data.resetSessions.push(...state.resetSessions.map((session) => resetToDomain(session, timeZone)));
  data.weeklyReviews.push(...state.weeklyReviews.map((review) => reviewToDomain(review, timeZone)));
  data.patternEntries.push(...state.patternEntries.map((entry) => patternToDomain(entry, timeZone)));
  data.routines.push(...state.routines.map((routine) => routineToDomain(routine, timeZone)));
  data.routineInstances.push(
    ...state.routineInstances.map((instance) =>
      routineInstanceToDomain(instance, state.routines, timeZone),
    ),
  );
  data.weekPlans.push(...state.weekPlans.map((plan) => weekPlanToDomain(plan, timeZone)));
  return DataStoreSchema.parse(data);
}

function settingsToUi(settings: DomainSettings | undefined, data: DataStore): UiSettings {
  const contact = settings?.emergencyContactId
    ? data.emergencyContacts.find((entity) => entity.id === settings.emergencyContactId)
    : undefined;
  const focusDuration = [25, 50, 90].includes(settings?.defaultFocusMinutes ?? 50)
    ? (settings?.defaultFocusMinutes as 25 | 50 | 90)
    : 50;
  return {
    name: settings?.displayName ?? "",
    dayStart: settings?.approximateDayStart ?? "07:30",
    meditationTime: settings?.preferredMeditationTime ?? "08:00",
    trainingTime: settings?.preferredTrainingTime ?? "18:00",
    reviewDay: String(settings?.weeklyReviewDay ?? 0),
    reviewTime: settings?.weeklyReviewTime ?? "18:00",
    focusDuration,
    anchors: (settings?.anchors ?? []).map((anchor) => ANCHOR_TO_UI[anchor]),
    movementCategories: settings
      ? settings.movementCategories
      : ["Muay Thai", "Fitness", "Spaziergang", "Laufen", "Mobility", "Erholung"],
    theme: settings?.theme ?? "system",
    sounds: settings?.timerSoundEnabled ?? true,
    haptics: settings?.hapticFeedbackEnabled ?? true,
    emergencyName: contact?.name ?? "",
    emergencyPhone: contact?.contact ?? "",
    timezone: settings?.timeZone ?? systemTimeZone(),
    identity: settings?.identityPractice
      ? {
          statement: settings.identityPractice.statement,
          action: settings.identityPractice.action,
          startedAt: settings.identityPractice.startedAt,
          reframe: settings.identityPractice.reframe,
          rehearsalDates: settings.identityPractice.rehearsalDates,
        }
      : undefined,
  };
}

function planToUi(
  plan: DataStore["dailyPlans"][number],
  data: DataStore,
): ZonedUi<UiDailyPlan> | null {
  const primary = data.dailyTasks.find(
    (task) => task.id === plan.primaryTaskId || (task.dailyPlanId === plan.id && task.role === "primary"),
  );
  if (!primary) return null;
  const secondary = data.dailyTasks
    .filter((task) => task.dailyPlanId === plan.id && task.role === "secondary")
    .sort((left, right) => left.order - right.order);
  const reflection = data.dailyReflections.find(
    (item) => item.localDate === plan.localDate && item.timeZone === plan.timeZone,
  );
  const taskToUi = (task: DataStore["dailyTasks"][number]): PlannerUiTask => {
    // Older schema-v2 task records used completedAt without a separate status.
    const status = task.status === "open" && task.completedAt !== null
      ? "completed"
      : task.status;
    return {
      id: task.id,
      title: task.title,
      completed: status === "completed",
      plannerBlockId: task.plannerBlockId ?? undefined,
      completedAt: task.completedAt ?? undefined,
      section: task.daySegment,
      plannedTime: task.scheduledTime ?? undefined,
      status,
      skippedAt: task.skippedAt ?? undefined,
      deferredAt: task.deferredAt ?? undefined,
      deferredTo: task.deferredToDate ?? undefined,
      originTaskId: task.carriedFromTaskId ?? undefined,
      deferredToTaskId: task.deferredToTaskId ?? undefined,
    };
  };
  const mainTask = taskToUi(primary);
  const secondaryTasks = secondary.map(taskToUi);
  return {
    id: plan.id,
    date: plan.localDate,
    intention: plan.intention ?? undefined,
    focusNote: plan.focusNote ?? undefined,
    plannerBlocks: plan.plannerBlocks.map((block) => ({
      id: block.id,
      title: block.title,
      note: block.note ?? undefined,
    })),
    energy: plan.energy ?? undefined,
    mentalState: plan.mentalRestlessness ?? undefined,
    mainTask,
    nextStep: primary.nextStep ?? "",
    secondaryTasks,
    bodyActivity: plan.bodyActivity,
    bodyCompleted: plan.bodyCompletedAt !== null,
    bodyCompletedAt: plan.bodyCompletedAt ?? undefined,
    meditationMinutes:
      typeof plan.meditationPlan === "number" ? plan.meditationPlan : undefined,
    meditationSkipped: plan.meditationPlan === "not-planned",
    meditationCompleted: plan.meditationCompletedAt !== null,
    meditationCompletedAt: plan.meditationCompletedAt ?? undefined,
    courageousAction: plan.courageousAction,
    courageousCompleted: plan.courageousActionCompletedAt !== null,
    courageousCompletedAt: plan.courageousActionCompletedAt ?? undefined,
    startTime: plan.primaryStartTime ?? undefined,
    reflection: reflection
      ? {
          important: reflection.whatMattered,
          leaveBehind: reflection.leaveBehind,
          note: reflection.note,
          identityEvidence: reflection.identityEvidence,
          completedAt: reflection.updatedAt,
        }
      : undefined,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    schemaVersion: UI_SCHEMA_VERSION,
    timezone: plan.timeZone,
  };
}

function focusToUi(session: DataStore["focusSessions"][number]): ZonedUi<UiFocusSession> {
  return {
    id: session.id,
    taskId: session.taskId ?? undefined,
    task: session.taskLabel,
    expectedOutcome: session.intendedOutcome,
    durationMinutes: session.plannedDurationSeconds / 60,
    startedAt: session.startedAt,
    plannedEndAt: session.plannedEndAt,
    pausedAt: session.pausedAt ?? undefined,
    totalPausedMs: session.accumulatedPausedMs,
    endedAt: session.endedAt ?? undefined,
    status: session.status === "cancelled" ? "completed" : session.status,
    driftStep: session.driftEvents.at(-1)?.smallestNextStep,
    result: session.outcome ?? undefined,
    nextStep: session.nextStep,
    bodyCheck: session.bodyCheck ? String(FOCUS_BODY_TO_UI[session.bodyCheck]) : undefined,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    schemaVersion: UI_SCHEMA_VERSION,
    timezone: session.timeZone,
  };
}

function meditationToUi(
  session: DataStore["meditationSessions"][number],
): ZonedUi<UiMeditationSession> {
  return {
    id: session.id,
    durationMinutes: session.plannedDurationSeconds / 60,
    focus: session.focus ? String(MEDITATION_FOCUS_TO_UI[session.focus]) : undefined,
    startedAt: session.startedAt,
    plannedEndAt: session.plannedEndAt,
    pausedAt: session.pausedAt ?? undefined,
    totalPausedMs: session.accumulatedPausedMs,
    status: session.status === "cancelled" ? "completed" : session.status,
    presence: session.presenceAfter === "not-rated" ? "skip" : session.presenceAfter ?? undefined,
    note: session.note,
    endedAt: session.endedAt ?? undefined,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    schemaVersion: UI_SCHEMA_VERSION,
    timezone: session.timeZone,
  };
}

function resetToUi(session: DataStore["resetSessions"][number]): ZonedUi<UiResetSession> {
  return {
    id: session.id,
    thought: session.thought,
    kind: String(RESET_KIND_TO_UI[session.thoughtType]),
    actionNeeded: session.actionNeeded,
    responsibleAction: session.responsibleAction,
    later: session.reflectionTime ? String(RESET_LATER_TO_UI[session.reflectionTime]) : undefined,
    missingInformation: session.missingInformation,
    unclearDecision: session.unclearResolution
      ? String(RESET_UNCLEAR_TO_UI[session.unclearResolution])
      : undefined,
    bodyReset: String(BODY_RESET_TO_UI[session.bodyResets[0]]),
    returnTo:
      session.returnTo === "custom"
        ? session.customReturn ?? "Eigener Eintrag"
        : String(RETURN_TO_UI[session.returnTo]),
    createdTask: session.createdTask,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    schemaVersion: UI_SCHEMA_VERSION,
    timezone: session.timeZone,
  };
}

function reviewToUi(review: DataStore["weeklyReviews"][number]): ZonedUi<UiWeeklyReview> {
  const answers = [
    review.answers.progress.join("\n"),
    review.answers.avoided ?? "",
    review.answers.madeTooLarge ?? "",
    review.answers.helpfulStructure ?? "",
    review.answers.hyperfocusOrLoops ?? "",
    review.answers.bodySupport ?? "",
    review.answers.emotionalPresence ?? "",
    ...review.answers.additionalAnswers,
  ];
  while (answers.length < 10) answers.push("");
  return {
    id: review.id,
    weekKey: review.weekStartDate,
    answers: answers.slice(0, 10),
    weeklyGoal: review.nextWeekGoal ?? "",
    outcomes: review.supportingOutcomes,
    movement: review.plannedMovement ?? "",
    meditationIntention: review.meditationIntention ?? "",
    omit: review.consciouslyOmitted ?? "",
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    schemaVersion: UI_SCHEMA_VERSION,
    timezone: review.timeZone,
  };
}

function patternToUi(entry: DomainPatternEntry): ZonedUi<UiPatternEntry> {
  return {
    id: entry.id,
    trigger:
      entry.trigger === "custom" ? entry.customTrigger ?? "Eigener Trigger" : String(TRIGGER_TO_UI[entry.trigger]),
    bodyState: String(BODY_STATE_TO_UI[entry.bodyState]),
    thought: entry.dominantThought,
    impulse: entry.impulse,
    action: String(PATTERN_ACTION_TO_UI[entry.chosenAction]),
    after: entry.stateAfter === "somewhat-better" ? "better" : entry.stateAfter,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    schemaVersion: UI_SCHEMA_VERSION,
    timezone: entry.timeZone,
  };
}

function routineToUi(routine: DomainRoutine): UiRoutine {
  return {
    id: routine.id,
    title: routine.title,
    section: routine.daySegment,
    time: routine.scheduledTime ?? undefined,
    weekdays: routine.weekdays,
    steps: [...routine.steps]
      .sort((left, right) => left.order - right.order)
      .map((step) => ({ id: step.id, title: step.label })),
    enabled: routine.active && routine.archivedAt === null,
    createdAt: routine.createdAt,
    updatedAt: routine.updatedAt,
    schemaVersion: UI_SCHEMA_VERSION,
    timezone: routine.timeZone,
  };
}

function routineInstanceToUi(instance: DomainRoutineInstance): UiRoutineInstance {
  return {
    id: instance.id,
    routineId: instance.routineId,
    date: instance.localDate,
    title: instance.routineTitle,
    section: instance.daySegment,
    time: instance.scheduledTime ?? undefined,
    status: instance.status === "skipped" ? "skipped" : "active",
    skippedAt: instance.skippedAt ?? undefined,
    steps: [...instance.steps]
      .sort((left, right) => left.order - right.order)
      .map((step) => ({
        id: step.id,
        sourceStepId: step.routineStepId,
        title: step.label,
        completed: step.completedAt !== null,
        completedAt: step.completedAt ?? undefined,
      })),
    createdAt: instance.createdAt,
    updatedAt: instance.updatedAt,
    schemaVersion: UI_SCHEMA_VERSION,
    timezone: instance.timeZone,
  };
}

function weekPlanToUi(plan: DomainWeeklyPlan): PlannerUiWeekPlan {
  return {
    id: plan.id,
    weekKey: plan.weekStartDate,
    focus: plan.focus ?? "",
    outcomes: plan.outcomes.map((item) => item.title),
    outcomeIds: plan.outcomes.map((item) => item.id),
    backlog: plan.backlog.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      scheduledDate: item.scheduledDate ?? undefined,
      completedAt: item.completedAt ?? undefined,
    })),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    schemaVersion: UI_SCHEMA_VERSION,
    timezone: plan.timeZone,
  };
}

function latestUpdatedAt(data: DataStore): string {
  const values = Object.values(data).flat();
  return values.map((entity) => entity.updatedAt).sort().at(-1) ?? new Date(0).toISOString();
}

/** Recreates the UI aggregate after validation, including reloadable active timers. */
export function dataStoreToAppState(source: DataStore): AppState {
  const data = DataStoreSchema.parse(source);
  const settings = [...data.appSettings].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const onboarding = [...data.onboardingStates].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )[0];
  const focusSessions = data.focusSessions.map(focusToUi);
  const meditationSessions = data.meditationSessions.map(meditationToUi);
  const activeFocus = focusSessions
    .filter((session) => ["running", "paused", "review"].includes(session.status))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const activeMeditation = meditationSessions
    .filter((session) => ["running", "paused", "review"].includes(session.status))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  return {
    key: "app",
    schemaVersion: UI_SCHEMA_VERSION,
    onboardingComplete: onboarding?.completed ?? false,
    settings: settingsToUi(settings, data),
    plans: data.dailyPlans
      .map((plan) => planToUi(plan, data))
      .filter((plan): plan is UiDailyPlan => plan !== null),
    focusSessions,
    meditationSessions,
    resetSessions: data.resetSessions.map(resetToUi),
    weeklyReviews: data.weeklyReviews.map(reviewToUi),
    patternEntries: data.patternEntries.map(patternToUi),
    routines: data.routines.map(routineToUi),
    routineInstances: data.routineInstances.map(routineInstanceToUi),
    weekPlans: data.weekPlans.map(weekPlanToUi),
    activeFocusId: activeFocus?.id,
    activeMeditationId: activeMeditation?.id,
    updatedAt: latestUpdatedAt(data),
  };
}
