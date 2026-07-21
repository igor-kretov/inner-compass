import { z } from "zod";

import { type DataStore } from "@/domain/entities";

import type { AppState } from "./app-store";
import { appStateToDataStore } from "./app-state-adapter";

const timestamp = z.string().datetime({ offset: true });
const legacyId = z.string().trim().min(1).max(200);
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const localTime = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const schemaVersion = z.number().int().min(1).max(1);
const timezone = z.string().trim().min(1).max(100).optional();

const LegacyTaskSchema = z
  .object({
    id: legacyId,
    title: z.string().trim().min(1).max(240),
    completed: z.boolean(),
    completedAt: timestamp.optional(),
  })
  .strict();

const LegacyDailyPlanSchema = z
  .object({
    id: legacyId,
    date: localDate,
    energy: z.enum(["low", "medium", "high"]).optional(),
    mentalState: z.enum(["calm", "moving", "overloaded"]).optional(),
    mainTask: LegacyTaskSchema,
    nextStep: z.string().max(300),
    secondaryTasks: z.array(LegacyTaskSchema).max(2),
    bodyActivity: z.string().max(120).optional(),
    bodyCompleted: z.boolean(),
    meditationMinutes: z.number().int().min(5).max(20).optional(),
    meditationSkipped: z.boolean(),
    meditationCompleted: z.boolean(),
    courageousAction: z.string().max(240).optional(),
    courageousCompleted: z.boolean(),
    startTime: localTime.optional(),
    reflection: z
      .object({
        important: z.string().max(500).optional(),
        leaveBehind: z.string().max(500).optional(),
        note: z.string().max(500).optional(),
        completedAt: timestamp,
      })
      .strict()
      .optional(),
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion,
    timezone,
  })
  .strict();

const LegacyFocusSessionSchema = z
  .object({
    id: legacyId,
    taskId: legacyId.optional(),
    task: z.string().trim().min(1).max(240),
    expectedOutcome: z.string().trim().min(1).max(300),
    durationMinutes: z.number().int().min(5).max(120),
    startedAt: timestamp,
    plannedEndAt: timestamp,
    pausedAt: timestamp.optional(),
    totalPausedMs: z.number().int().nonnegative(),
    endedAt: timestamp.optional(),
    status: z.enum(["running", "paused", "review", "completed"]),
    driftStep: z.string().max(300).optional(),
    result: z.enum(["yes", "partly", "no"]).optional(),
    nextStep: z.string().max(300).optional(),
    bodyCheck: z.string().max(80).optional(),
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion,
    timezone,
  })
  .strict();

const LegacyMeditationSessionSchema = z
  .object({
    id: legacyId,
    durationMinutes: z.number().int().min(1).max(60),
    focus: z.string().max(80).optional(),
    startedAt: timestamp,
    plannedEndAt: timestamp,
    pausedAt: timestamp.optional(),
    totalPausedMs: z.number().int().nonnegative(),
    status: z.enum(["running", "paused", "review", "completed"]),
    presence: z.enum(["yes", "somewhat", "no", "skip"]).optional(),
    note: z.string().max(500).optional(),
    endedAt: timestamp.optional(),
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion,
    timezone,
  })
  .strict();

const LegacyResetSessionSchema = z
  .object({
    id: legacyId,
    thought: z.string().trim().min(1).max(300),
    kind: z.string().trim().min(1).max(100),
    actionNeeded: z.enum(["yes", "no", "unclear"]),
    responsibleAction: z.string().max(300).optional(),
    later: z.string().max(100).optional(),
    missingInformation: z.string().max(300).optional(),
    unclearDecision: z.string().max(100).optional(),
    bodyReset: z.string().trim().min(1).max(100),
    returnTo: z.string().trim().min(1).max(200),
    createdTask: z.boolean(),
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion,
    timezone,
  })
  .strict();

const LegacyWeeklyReviewSchema = z
  .object({
    id: legacyId,
    weekKey: localDate,
    answers: z.array(z.string().max(1_000)).max(10),
    weeklyGoal: z.string().max(500),
    outcomes: z.array(z.string().max(300)).max(3),
    movement: z.string().max(300),
    meditationIntention: z.string().max(300),
    omit: z.string().max(500),
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion,
    timezone,
  })
  .strict();

const LegacyPatternEntrySchema = z
  .object({
    id: legacyId,
    trigger: z.string().trim().min(1).max(120),
    bodyState: z.string().trim().min(1).max(80),
    thought: z.string().max(300).optional(),
    impulse: z.string().max(200).optional(),
    action: z.string().trim().min(1).max(100),
    after: z.enum(["worse", "same", "better", "much-better"]),
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion,
    timezone,
  })
  .strict();

const LegacySettingsSchema = z
  .object({
    name: z.string().max(80),
    dayStart: localTime,
    meditationTime: localTime,
    trainingTime: localTime,
    reviewDay: z.string().regex(/^[0-6]$/),
    reviewTime: localTime,
    focusDuration: z.union([z.literal(25), z.literal(50), z.literal(90)]),
    anchors: z.array(z.string().max(40)).max(3),
    theme: z.enum(["system", "light", "dark"]),
    sounds: z.boolean(),
    haptics: z.boolean(),
    emergencyName: z.string().max(100),
    emergencyPhone: z.string().max(40),
    timezone: z.string().trim().min(1).max(100),
  })
  .strict();

export const LegacyAppStateSchema = z
  .object({
    key: z.literal("app"),
    schemaVersion,
    onboardingComplete: z.boolean(),
    settings: LegacySettingsSchema,
    plans: z.array(LegacyDailyPlanSchema),
    focusSessions: z.array(LegacyFocusSessionSchema),
    meditationSessions: z.array(LegacyMeditationSessionSchema),
    resetSessions: z.array(LegacyResetSessionSchema),
    weeklyReviews: z.array(LegacyWeeklyReviewSchema),
    patternEntries: z.array(LegacyPatternEntrySchema),
    activeFocusId: legacyId.optional(),
    activeMeditationId: legacyId.optional(),
    updatedAt: timestamp,
  })
  .strict();

export const LegacyUiExportEnvelopeSchema = z
  .object({
    format: z.literal("inner-compass-export"),
    exportVersion: z.literal(1),
    schemaVersion: z.literal(1),
    exportedAt: timestamp,
    data: LegacyAppStateSchema,
  })
  .strict();

export function legacyAppStateToDataStore(source: unknown): DataStore {
  const parsed = LegacyAppStateSchema.parse(source);
  return appStateToDataStore({
    ...parsed,
    // Planner collections were added after the legacy aggregate format. They
    // start empty while every pre-existing plan and task is preserved.
    routines: [],
    routineInstances: [],
    weekPlans: [],
  } as AppState);
}
