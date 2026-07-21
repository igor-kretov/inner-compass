import { z } from "zod";

export const ENTITY_SCHEMA_VERSION = 2 as const;
export const EXPORT_FORMAT_VERSION = 2 as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isRealLocalDate(value: string): boolean {
  if (!LOCAL_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function isIanaTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

export const StableIdSchema = z
  .string()
  .regex(UUID_PATTERN, "Eine stabile UUID wird erwartet.");
export const IsoTimestampSchema = z
  .string()
  .datetime({ offset: true, message: "Ein ISO-Zeitstempel mit Zeitzone wird erwartet." });
export const IanaTimeZoneSchema = z
  .string()
  .min(1)
  .max(100)
  .refine(isIanaTimeZone, "Eine gültige IANA-Zeitzone wird erwartet.");
export const LocalDateSchema = z
  .string()
  .refine(isRealLocalDate, "Ein gültiges lokales Datum im Format YYYY-MM-DD wird erwartet.");
export const LocalTimeSchema = z
  .string()
  .regex(LOCAL_TIME_PATTERN, "Eine lokale Uhrzeit im Format HH:mm wird erwartet.");

export const BaseEntitySchema = z
  .object({
    id: StableIdSchema,
    createdAt: IsoTimestampSchema,
    updatedAt: IsoTimestampSchema,
    timeZone: IanaTimeZoneSchema,
    schemaVersion: z.literal(ENTITY_SCHEMA_VERSION),
  })
  .strict();

const shortText = (max: number) => z.string().trim().max(max);
const optionalShortText = (max: number) => shortText(max).optional();

export const DAY_SEGMENTS = ["morning", "day", "evening"] as const;
export const DaySegmentSchema = z.enum(DAY_SEGMENTS);

export const LIFE_ANCHORS = [
  "body",
  "work",
  "rest",
  "relationships",
  "courage",
  "order",
  "creativity",
  "spirituality",
] as const;

export const AppSettingsSchema = BaseEntitySchema.extend({
  displayName: optionalShortText(80),
  approximateDayStart: LocalTimeSchema.optional(),
  preferredMeditationTime: LocalTimeSchema.optional(),
  preferredTrainingTime: LocalTimeSchema.optional(),
  weeklyReviewDay: z.number().int().min(0).max(6).default(0),
  weeklyReviewTime: LocalTimeSchema.default("18:00"),
  defaultFocusMinutes: z.number().int().min(5).max(120).default(50),
  theme: z.enum(["system", "light", "dark"]).default("system"),
  timerSoundEnabled: z.boolean().default(true),
  hapticFeedbackEnabled: z.boolean().default(true),
  anchors: z.array(z.enum(LIFE_ANCHORS)).max(3).default([]),
  movementCategories: z
    .array(shortText(100).min(1))
    .max(30)
    .default(["Muay Thai", "Fitness", "Spaziergang", "Laufen", "Mobility", "Erholung"]),
  identityPractice: z
    .object({
      statement: shortText(240).min(1),
      action: optionalShortText(300),
      startedAt: IsoTimestampSchema,
      oldStory: optionalShortText(500),
      reframe: optionalShortText(500),
      rehearsalDates: z
        .array(LocalDateSchema)
        .max(366)
        .refine(
          (dates) => new Set(dates).size === dates.length,
          "Mentale Proben müssen eindeutigen Tagen zugeordnet sein.",
        )
        .default([]),
    })
    .strict()
    .nullable()
    .default(null),
  emergencyContactId: StableIdSchema.nullable().default(null),
}).strict();

export const OnboardingStateSchema = BaseEntitySchema.extend({
  currentStep: z.number().int().min(1).max(5).default(1),
  completed: z.boolean().default(false),
  completedAt: IsoTimestampSchema.nullable().default(null),
}).strict();

export const DailyPlanSchema = BaseEntitySchema.extend({
  localDate: LocalDateSchema,
  status: z.enum(["draft", "planned", "closed"]).default("draft"),
  energy: z.enum(["low", "medium", "high"]).nullable().default(null),
  mentalRestlessness: z
    .enum(["calm", "moving", "overloaded"])
    .nullable()
    .default(null),
  primaryTaskId: StableIdSchema.nullable().default(null),
  // Kept under its original name so existing primary/secondary exports remain valid.
  // In planner views this is the ordered, dynamic task list beside the primary task.
  secondaryTaskIds: z.array(StableIdSchema).max(30).default([]),
  bodyActivity: optionalShortText(120),
  bodyCompletedAt: IsoTimestampSchema.nullable().default(null),
  meditationPlan: z
    .union([z.literal(5), z.literal(10), z.literal(20), z.literal("not-planned")])
    .nullable()
    .default(null),
  meditationCompletedAt: IsoTimestampSchema.nullable().default(null),
  courageousAction: optionalShortText(240),
  courageousActionCompletedAt: IsoTimestampSchema.nullable().default(null),
  primaryStartTime: LocalTimeSchema.nullable().default(null),
  plannedAt: IsoTimestampSchema.nullable().default(null),
}).strict();

export const DailyTaskSchema = BaseEntitySchema.extend({
  dailyPlanId: StableIdSchema,
  role: z.enum(["primary", "secondary"]),
  title: shortText(240).min(1),
  nextStep: optionalShortText(300),
  order: z.number().int().min(0).max(30),
  daySegment: DaySegmentSchema.default("day"),
  scheduledTime: LocalTimeSchema.nullable().default(null),
  status: z.enum(["open", "completed", "skipped", "deferred"]).default("open"),
  startedAt: IsoTimestampSchema.nullable().default(null),
  completedAt: IsoTimestampSchema.nullable().default(null),
  skippedAt: IsoTimestampSchema.nullable().default(null),
  deferredAt: IsoTimestampSchema.nullable().default(null),
  deferredToDate: LocalDateSchema.nullable().default(null),
  deferredToTaskId: StableIdSchema.nullable().default(null),
  carriedFromTaskId: StableIdSchema.nullable().default(null),
}).strict();

export const TimerStatusSchema = z.enum([
  "running",
  "paused",
  "review",
  "completed",
  "cancelled",
]);

export const PersistedTimerFieldsSchema = z
  .object({
    status: TimerStatusSchema,
    plannedDurationSeconds: z.number().int().min(1).max(7_200),
    startedAt: IsoTimestampSchema,
    plannedEndAt: IsoTimestampSchema,
    pausedAt: IsoTimestampSchema.nullable().default(null),
    accumulatedPausedMs: z.number().int().nonnegative().default(0),
    endedAt: IsoTimestampSchema.nullable().default(null),
  })
  .strict();

export const FocusSessionSchema = BaseEntitySchema.extend({
  localDate: LocalDateSchema,
  taskId: StableIdSchema.nullable().default(null),
  taskLabel: shortText(240).min(1),
  intendedOutcome: shortText(300).min(1),
  status: TimerStatusSchema,
  plannedDurationSeconds: z.number().int().min(300).max(7_200),
  startedAt: IsoTimestampSchema,
  plannedEndAt: IsoTimestampSchema,
  pausedAt: IsoTimestampSchema.nullable().default(null),
  accumulatedPausedMs: z.number().int().nonnegative().default(0),
  endedAt: IsoTimestampSchema.nullable().default(null),
  outcome: z.enum(["yes", "partly", "no"]).nullable().default(null),
  nextStep: optionalShortText(300),
  bodyCheck: z
    .enum(["water", "move", "eat", "toilet", "distance", "nothing"])
    .nullable()
    .default(null),
  driftEvents: z
    .array(
      z
        .object({
          noticedAt: IsoTimestampSchema,
          timerAction: z.enum(["continued", "paused"]),
          smallestNextStep: shortText(300).min(1),
        })
        .strict(),
    )
    .default([]),
  hyperfocusBreakChoice: z
    .enum(["walk", "water", "eat", "mobility", "continue-consciously"])
    .nullable()
    .default(null),
  hyperfocusAcknowledgedAt: IsoTimestampSchema.nullable().default(null),
}).strict();

export const MeditationFocusSchema = z.enum([
  "breath",
  "body",
  "sounds",
  "thoughts",
  "open",
  "identity-rehearsal",
]);

export const MeditationSessionSchema = BaseEntitySchema.extend({
  localDate: LocalDateSchema,
  focus: MeditationFocusSchema.nullable().default(null),
  status: TimerStatusSchema,
  plannedDurationSeconds: z.number().int().min(60).max(3_600),
  startedAt: IsoTimestampSchema,
  plannedEndAt: IsoTimestampSchema,
  pausedAt: IsoTimestampSchema.nullable().default(null),
  accumulatedPausedMs: z.number().int().nonnegative().default(0),
  endedAt: IsoTimestampSchema.nullable().default(null),
  presenceAfter: z
    .enum(["yes", "somewhat", "no", "not-rated"])
    .nullable()
    .default(null),
  note: optionalShortText(500),
}).strict();

export const ResetSessionSchema = BaseEntitySchema.extend({
  localDate: LocalDateSchema,
  thought: shortText(300).min(1),
  thoughtType: z.enum([
    "real-problem",
    "decision",
    "emotion",
    "recurring-scenario",
    "unknown",
  ]),
  actionNeeded: z.enum(["yes", "no", "unclear"]),
  responsibleAction: optionalShortText(300),
  reflectionTime: z
    .enum(["tonight", "tomorrow", "weekly-review", "do-not-schedule"])
    .nullable()
    .default(null),
  missingInformation: optionalShortText(300),
  unclearResolution: z
    .enum(["get-information", "defer-decision", "let-go"])
    .nullable()
    .default(null),
  bodyResets: z
    .array(
      z.enum([
        "ten-breaths",
        "walk-two-minutes",
        "twenty-squats",
        "drink-water",
        "cold-water",
        "relax-shoulders-jaw",
        "observe-room",
      ]),
    )
    .min(1),
  returnTo: z.enum([
    "primary-task",
    "next-task",
    "training",
    "social-action",
    "rest",
    "custom",
  ]),
  customReturn: optionalShortText(200),
  createdTask: z.boolean().default(false),
  completedAt: IsoTimestampSchema,
}).strict();

export const DailyReflectionSchema = BaseEntitySchema.extend({
  localDate: LocalDateSchema,
  whatMattered: optionalShortText(500),
  leaveBehind: optionalShortText(500),
  note: optionalShortText(500),
  identityEvidence: optionalShortText(500),
}).strict();

const optionalReviewAnswer = optionalShortText(1_000);

export const WeeklyReviewSchema = BaseEntitySchema.extend({
  weekStartDate: LocalDateSchema,
  completedAt: IsoTimestampSchema,
  answers: z
    .object({
      progress: z.array(shortText(300)).max(3).default([]),
      avoided: optionalReviewAnswer,
      madeTooLarge: optionalReviewAnswer,
      helpfulStructure: optionalReviewAnswer,
      hyperfocusOrLoops: optionalReviewAnswer,
      bodySupport: optionalReviewAnswer,
      emotionalPresence: optionalReviewAnswer,
      additionalAnswers: z.array(shortText(1_000)).max(3).default([]),
    })
    .strict(),
  nextWeekGoal: optionalShortText(500),
  supportingOutcomes: z.array(shortText(300)).max(3).default([]),
  plannedMovement: optionalShortText(300),
  plannedMovementSessions: z.number().int().min(0).max(14).nullable().default(null),
  meditationIntention: optionalShortText(300),
  consciouslyOmitted: optionalShortText(500),
}).strict();

export const RoutineStepSchema = z
  .object({
    id: StableIdSchema,
    label: shortText(160).min(1),
    order: z.number().int().min(0).max(19),
  })
  .strict();

export const RoutineSchema = BaseEntitySchema.extend({
  title: shortText(120).min(1),
  weekdays: z
    .array(z.number().int().min(0).max(6))
    .min(1)
    .max(7)
    .refine((days) => new Set(days).size === days.length, "Wochentage müssen eindeutig sein."),
  daySegment: DaySegmentSchema,
  scheduledTime: LocalTimeSchema.nullable().default(null),
  steps: z
    .array(RoutineStepSchema)
    .min(1)
    .max(20)
    .refine(
      (steps) => new Set(steps.map((step) => step.id)).size === steps.length,
      "Routine-Schritte müssen eindeutige IDs haben.",
    ),
  active: z.boolean().default(true),
  archivedAt: IsoTimestampSchema.nullable().default(null),
}).strict();

export const RoutineInstanceStepSchema = z
  .object({
    id: StableIdSchema,
    routineStepId: StableIdSchema,
    label: shortText(160).min(1),
    order: z.number().int().min(0).max(19),
    completedAt: IsoTimestampSchema.nullable().default(null),
  })
  .strict();

export const RoutineInstanceSchema = BaseEntitySchema.extend({
  routineId: StableIdSchema,
  localDate: LocalDateSchema,
  routineTitle: shortText(120).min(1),
  daySegment: DaySegmentSchema,
  scheduledTime: LocalTimeSchema.nullable().default(null),
  sourceRoutineUpdatedAt: IsoTimestampSchema,
  steps: z.array(RoutineInstanceStepSchema).min(1).max(20),
  status: z.enum(["open", "completed", "skipped"]).default("open"),
  completedAt: IsoTimestampSchema.nullable().default(null),
  skippedAt: IsoTimestampSchema.nullable().default(null),
}).strict();

export const WeeklyPlanItemSchema = z
  .object({
    id: StableIdSchema,
    title: shortText(240).min(1),
    status: z.enum(["open", "scheduled", "completed"]).default("open"),
    scheduledDate: LocalDateSchema.nullable().default(null),
    completedAt: IsoTimestampSchema.nullable().default(null),
  })
  .strict();

export const WeeklyPlanSchema = BaseEntitySchema.extend({
  weekStartDate: LocalDateSchema,
  focus: shortText(500).nullable().default(null),
  outcomes: z.array(WeeklyPlanItemSchema).max(3).default([]),
  backlog: z.array(WeeklyPlanItemSchema).max(30).default([]),
}).strict();

export const PATTERN_TRIGGERS = [
  "work",
  "relationship",
  "jealousy",
  "performance-pressure",
  "loneliness",
  "fatigue",
  "consumption",
  "social-situation",
  "disorder",
  "unknown",
  "custom",
] as const;

export const PATTERN_ACTIONS = [
  "kept-thinking",
  "sought-conversation",
  "started-task",
  "meditated",
  "trained",
  "walked",
  "consumed",
  "slept",
  "let-go",
  "other",
] as const;

export const PatternEntrySchema = BaseEntitySchema.extend({
  localDate: LocalDateSchema,
  occurredAt: IsoTimestampSchema,
  trigger: z.enum(PATTERN_TRIGGERS),
  customTrigger: optionalShortText(120),
  bodyState: z.enum([
    "tense",
    "restless",
    "exhausted",
    "activated",
    "calm",
    "heavy",
    "neutral",
  ]),
  dominantThought: optionalShortText(300),
  impulse: optionalShortText(200),
  chosenAction: z.enum(PATTERN_ACTIONS),
  stateAfter: z.enum(["worse", "same", "somewhat-better", "much-better"]),
}).strict();

export const EmergencyContactSchema = BaseEntitySchema.extend({
  name: shortText(100).min(1),
  contact: shortText(200).min(1),
}).strict();

export const EntitySchemas = {
  appSettings: AppSettingsSchema,
  onboardingStates: OnboardingStateSchema,
  dailyPlans: DailyPlanSchema,
  dailyTasks: DailyTaskSchema,
  focusSessions: FocusSessionSchema,
  meditationSessions: MeditationSessionSchema,
  resetSessions: ResetSessionSchema,
  dailyReflections: DailyReflectionSchema,
  weeklyReviews: WeeklyReviewSchema,
  patternEntries: PatternEntrySchema,
  emergencyContacts: EmergencyContactSchema,
  routines: RoutineSchema,
  routineInstances: RoutineInstanceSchema,
  weekPlans: WeeklyPlanSchema,
} as const;

export type AppSettings = z.infer<typeof AppSettingsSchema>;
export type OnboardingState = z.infer<typeof OnboardingStateSchema>;
export type DailyPlan = z.infer<typeof DailyPlanSchema>;
export type DailyTask = z.infer<typeof DailyTaskSchema>;
export type FocusSession = z.infer<typeof FocusSessionSchema>;
export type MeditationSession = z.infer<typeof MeditationSessionSchema>;
export type ResetSession = z.infer<typeof ResetSessionSchema>;
export type DailyReflection = z.infer<typeof DailyReflectionSchema>;
export type WeeklyReview = z.infer<typeof WeeklyReviewSchema>;
export type PatternEntry = z.infer<typeof PatternEntrySchema>;
export type EmergencyContact = z.infer<typeof EmergencyContactSchema>;
export type PersistedTimerFields = z.infer<typeof PersistedTimerFieldsSchema>;
export type DaySegment = z.infer<typeof DaySegmentSchema>;
export type RoutineStep = z.infer<typeof RoutineStepSchema>;
export type Routine = z.infer<typeof RoutineSchema>;
export type RoutineInstanceStep = z.infer<typeof RoutineInstanceStepSchema>;
export type RoutineInstance = z.infer<typeof RoutineInstanceSchema>;
export type WeeklyPlanItem = z.infer<typeof WeeklyPlanItemSchema>;
export type WeeklyPlan = z.infer<typeof WeeklyPlanSchema>;

export interface CollectionTypes {
  appSettings: AppSettings;
  onboardingStates: OnboardingState;
  dailyPlans: DailyPlan;
  dailyTasks: DailyTask;
  focusSessions: FocusSession;
  meditationSessions: MeditationSession;
  resetSessions: ResetSession;
  dailyReflections: DailyReflection;
  weeklyReviews: WeeklyReview;
  patternEntries: PatternEntry;
  emergencyContacts: EmergencyContact;
  routines: Routine;
  routineInstances: RoutineInstance;
  weekPlans: WeeklyPlan;
}

export type CollectionName = keyof CollectionTypes;
export type AnyEntity = CollectionTypes[CollectionName];

export const COLLECTION_NAMES = Object.freeze(
  Object.keys(EntitySchemas) as CollectionName[],
);

export const DataStoreSchema = z
  .object({
    appSettings: z.array(AppSettingsSchema),
    onboardingStates: z.array(OnboardingStateSchema),
    dailyPlans: z.array(DailyPlanSchema),
    dailyTasks: z.array(DailyTaskSchema),
    focusSessions: z.array(FocusSessionSchema),
    meditationSessions: z.array(MeditationSessionSchema),
    resetSessions: z.array(ResetSessionSchema),
    dailyReflections: z.array(DailyReflectionSchema),
    weeklyReviews: z.array(WeeklyReviewSchema),
    patternEntries: z.array(PatternEntrySchema),
    emergencyContacts: z.array(EmergencyContactSchema),
    // Additive defaults make every schema-v2 export from before the planner
    // directly importable without rewriting its existing records.
    routines: z.array(RoutineSchema).default([]),
    routineInstances: z.array(RoutineInstanceSchema).default([]),
    weekPlans: z.array(WeeklyPlanSchema).default([]),
  })
  .strict();
export type DataStore = z.infer<typeof DataStoreSchema>;

export const DataExportEnvelopeSchema = z
  .object({
    format: z.literal("inner-compass"),
    exportVersion: z.literal(EXPORT_FORMAT_VERSION),
    schemaVersion: z.literal(ENTITY_SCHEMA_VERSION),
    exportedAt: IsoTimestampSchema,
    appVersion: z.string().trim().max(40).optional(),
    data: DataStoreSchema,
  })
  .strict();

export type DataExportEnvelope = z.infer<typeof DataExportEnvelopeSchema>;

export function emptyDataStore(): DataStore {
  return {
    appSettings: [],
    onboardingStates: [],
    dailyPlans: [],
    dailyTasks: [],
    focusSessions: [],
    meditationSessions: [],
    resetSessions: [],
    dailyReflections: [],
    weeklyReviews: [],
    patternEntries: [],
    emergencyContacts: [],
    routines: [],
    routineInstances: [],
    weekPlans: [],
  };
}

export function validateEntity<K extends CollectionName>(
  collection: K,
  entity: CollectionTypes[K],
): CollectionTypes[K] {
  return EntitySchemas[collection].parse(entity) as CollectionTypes[K];
}
