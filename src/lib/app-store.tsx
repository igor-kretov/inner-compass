"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createStableId } from "@/domain/factories";
import { appStateToDataStore, dataStoreToAppState } from "@/lib/app-state-adapter";
import {
  createDataExport,
  parseDataImport,
  previewDataImport,
  serializeDataExport,
} from "@/lib/data-transfer";
import { createRepository, type StorageBackendKind } from "@/lib/db/repository";

export const APP_SCHEMA_VERSION = 2;

export type Energy = "low" | "medium" | "high";
export type MentalState = "calm" | "moving" | "overloaded";
export type DaySection = "morning" | "day" | "evening";
export type PlannerItemStatus = "open" | "completed" | "skipped" | "deferred";
export type Task = {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  section?: DaySection;
  plannedTime?: string;
  status?: PlannerItemStatus;
  skippedAt?: string;
  deferredAt?: string;
  deferredTo?: string;
  originTaskId?: string;
};

export type RoutineStepTemplate = {
  id: string;
  title: string;
};

export type RoutineTemplate = {
  id: string;
  title: string;
  section: DaySection;
  time?: string;
  weekdays: number[];
  steps: RoutineStepTemplate[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  timezone?: string;
};

export type RoutineStepInstance = {
  id: string;
  sourceStepId: string;
  title: string;
  completed: boolean;
  completedAt?: string;
};

export type RoutineInstance = {
  id: string;
  routineId: string;
  date: string;
  title: string;
  section: DaySection;
  time?: string;
  status: "active" | "skipped";
  skippedAt?: string;
  steps: RoutineStepInstance[];
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  timezone?: string;
};

export type WeekBacklogItem = {
  id: string;
  title: string;
  status: "open" | "scheduled" | "completed";
  scheduledDate?: string;
  completedAt?: string;
};

export type WeekPlan = {
  id: string;
  weekKey: string;
  focus: string;
  outcomes: string[];
  backlog: WeekBacklogItem[];
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  timezone?: string;
};

export type DailyPlan = {
  id: string;
  date: string;
  energy?: Energy;
  mentalState?: MentalState;
  mainTask: Task;
  nextStep: string;
  secondaryTasks: Task[];
  bodyActivity?: string;
  bodyCompleted: boolean;
  bodyCompletedAt?: string;
  meditationMinutes?: number;
  meditationSkipped: boolean;
  meditationCompleted: boolean;
  meditationCompletedAt?: string;
  courageousAction?: string;
  courageousCompleted: boolean;
  courageousCompletedAt?: string;
  startTime?: string;
  reflection?: {
    important?: string;
    leaveBehind?: string;
    note?: string;
    identityEvidence?: string;
    completedAt: string;
  };
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  timezone?: string;
};

export type FocusStatus = "running" | "paused" | "review" | "completed";
export type FocusSession = {
  id: string;
  taskId?: string;
  task: string;
  expectedOutcome: string;
  durationMinutes: number;
  startedAt: string;
  plannedEndAt: string;
  pausedAt?: string;
  totalPausedMs: number;
  endedAt?: string;
  status: FocusStatus;
  driftStep?: string;
  result?: "yes" | "partly" | "no";
  nextStep?: string;
  bodyCheck?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  timezone?: string;
};

export type MeditationSession = {
  id: string;
  durationMinutes: number;
  focus?: string;
  startedAt: string;
  plannedEndAt: string;
  pausedAt?: string;
  totalPausedMs: number;
  status: "running" | "paused" | "review" | "completed";
  presence?: "yes" | "somewhat" | "no" | "skip";
  note?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  timezone?: string;
};

export type ResetSession = {
  id: string;
  thought: string;
  kind: string;
  actionNeeded: "yes" | "no" | "unclear";
  responsibleAction?: string;
  later?: string;
  missingInformation?: string;
  unclearDecision?: string;
  bodyReset: string;
  returnTo: string;
  createdTask: boolean;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  timezone?: string;
};

export type WeeklyReview = {
  id: string;
  weekKey: string;
  answers: string[];
  weeklyGoal: string;
  outcomes: string[];
  movement: string;
  meditationIntention: string;
  omit: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  timezone?: string;
};

export type PatternEntry = {
  id: string;
  trigger: string;
  bodyState: string;
  thought?: string;
  impulse?: string;
  action: string;
  after: "worse" | "same" | "better" | "much-better";
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  timezone?: string;
};

export type ThemeMode = "system" | "light" | "dark";
export const DEFAULT_MOVEMENT_CATEGORIES = [
  "Muay Thai",
  "Fitness",
  "Spaziergang",
  "Laufen",
  "Mobility",
  "Erholung",
] as const;

export type IdentityProfile = {
  statement: string;
  action?: string;
  startedAt: string;
  reframe?: string;
  rehearsalDates: string[];
};

export type AppSettings = {
  name: string;
  dayStart: string;
  meditationTime: string;
  trainingTime: string;
  reviewDay: string;
  reviewTime: string;
  focusDuration: 25 | 50 | 90;
  anchors: string[];
  movementCategories: string[];
  theme: ThemeMode;
  sounds: boolean;
  haptics: boolean;
  emergencyName: string;
  emergencyPhone: string;
  timezone: string;
  identity?: IdentityProfile;
};

export type AppState = {
  key: "app";
  schemaVersion: number;
  onboardingComplete: boolean;
  settings: AppSettings;
  plans: DailyPlan[];
  focusSessions: FocusSession[];
  meditationSessions: MeditationSession[];
  resetSessions: ResetSession[];
  weeklyReviews: WeeklyReview[];
  patternEntries: PatternEntry[];
  routines: RoutineTemplate[];
  routineInstances: RoutineInstance[];
  weekPlans: WeekPlan[];
  activeFocusId?: string;
  activeMeditationId?: string;
  updatedAt: string;
};

const nowIso = () => new Date().toISOString();
export const newId = () =>
  createStableId();

export const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const shiftLocalDate = (dateKey: string, days: number) => {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
};

export const weekStartKey = (dateKey = localDateKey()) => {
  const date = new Date(`${dateKey}T12:00:00`);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return localDateKey(date);
};

export const resolvedTaskStatus = (task: Task): PlannerItemStatus =>
  task.completed ? "completed" : task.status ?? "open";

const defaultSettings = (): AppSettings => ({
  name: "",
  dayStart: "07:30",
  meditationTime: "08:00",
  trainingTime: "18:00",
  reviewDay: "0",
  reviewTime: "18:00",
  focusDuration: 50,
  anchors: [],
  movementCategories: [...DEFAULT_MOVEMENT_CATEGORIES],
  theme: "system",
  sounds: true,
  haptics: true,
  emergencyName: "",
  emergencyPhone: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
});

export const emptyState = (): AppState => ({
  key: "app",
  schemaVersion: APP_SCHEMA_VERSION,
  onboardingComplete: false,
  settings: defaultSettings(),
  plans: [],
  focusSessions: [],
  meditationSessions: [],
  resetSessions: [],
  weeklyReviews: [],
  patternEntries: [],
  routines: [],
  routineInstances: [],
  weekPlans: [],
  updatedAt: nowIso(),
});

const repository = createRepository();
const fallbackKey = "inner-compass:fallback:v1";

function normalizeTask(task: Task): Task {
  const status = task.status ?? (task.completed ? "completed" : "open");
  return {
    ...task,
    completed: status === "completed" || task.completed,
    status: task.completed ? "completed" : status,
    section: task.section ?? "day",
  };
}

function normalizeMovementCategories(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_MOVEMENT_CATEGORIES];
  const unique = new Map<string, string>();
  for (let index = value.length - 1; index >= 0; index -= 1) {
    const item = value[index];
    if (typeof item !== "string") continue;
    const category = item.trim();
    if (!category) continue;
    const key = category.toLocaleLowerCase();
    if (!unique.has(key)) unique.set(key, category);
  }
  return [...unique.values()].reverse().slice(-30);
}

function normalizeIdentityProfile(value: unknown): IdentityProfile | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Partial<Record<keyof IdentityProfile, unknown>>;
  const statement = typeof source.statement === "string"
    ? source.statement.trim().slice(0, 240)
    : "";
  const startedAt = typeof source.startedAt === "string" ? new Date(source.startedAt) : null;
  if (!statement || !startedAt || Number.isNaN(startedAt.getTime())) return undefined;

  const optionalText = (input: unknown, max: number) => {
    if (typeof input !== "string") return undefined;
    const normalized = input.trim().slice(0, max);
    return normalized || undefined;
  };
  const validLocalDate = (input: unknown): input is string => {
    if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
    const [year, month, day] = input.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year
      && parsed.getUTCMonth() === month - 1
      && parsed.getUTCDate() === day;
  };
  const rehearsalDates = Array.isArray(source.rehearsalDates)
    ? [...new Set(
        source.rehearsalDates.filter(validLocalDate),
      )].sort().slice(-366)
    : [];

  return {
    statement,
    action: optionalText(source.action, 300),
    startedAt: startedAt.toISOString(),
    reframe: optionalText(source.reframe, 500),
    rehearsalDates,
  };
}

function normalizeState(value: Partial<AppState> | undefined): AppState {
  const base = emptyState();
  const currentTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  if (!value) return base;
  return {
    ...base,
    ...value,
    key: "app",
    schemaVersion: APP_SCHEMA_VERSION,
    settings: {
      ...base.settings,
      ...(value.settings ?? {}),
      movementCategories: normalizeMovementCategories(value.settings?.movementCategories),
      identity: normalizeIdentityProfile(value.settings?.identity),
      timezone: currentTimeZone,
    },
    plans: Array.isArray(value.plans)
      ? value.plans.map((plan) => ({
          ...plan,
          schemaVersion: APP_SCHEMA_VERSION,
          mainTask: normalizeTask(plan.mainTask),
          secondaryTasks: Array.isArray(plan.secondaryTasks)
            ? plan.secondaryTasks.map(normalizeTask)
            : [],
        }))
      : [],
    focusSessions: Array.isArray(value.focusSessions) ? value.focusSessions : [],
    meditationSessions: Array.isArray(value.meditationSessions)
      ? value.meditationSessions
      : [],
    resetSessions: Array.isArray(value.resetSessions) ? value.resetSessions : [],
    weeklyReviews: Array.isArray(value.weeklyReviews) ? value.weeklyReviews : [],
    patternEntries: Array.isArray(value.patternEntries) ? value.patternEntries : [],
    routines: Array.isArray(value.routines) ? value.routines : [],
    routineInstances: Array.isArray(value.routineInstances) ? value.routineInstances : [],
    weekPlans: Array.isArray(value.weekPlans) ? value.weekPlans : [],
  };
}

function dataStoreHasEntries(data: Awaited<ReturnType<typeof repository.exportData>>) {
  return Object.values(data).some((collection) => collection.length > 0);
}

async function readState(): Promise<{ state: AppState; backend: StorageBackendKind }> {
  if (typeof window === "undefined") return { state: emptyState(), backend: "memory" };
  try {
    const data = await repository.exportData();
    const backend = await repository.backendKind();
    if (dataStoreHasEntries(data)) {
      return { state: normalizeState(dataStoreToAppState(data)), backend };
    }

    // One-time migration from the early UI snapshot used during development.
    const legacy = window.localStorage.getItem(fallbackKey);
    if (legacy) {
      const migrated = normalizeState(JSON.parse(legacy) as Partial<AppState>);
      await repository.replaceAll(appStateToDataStore(migrated));
      window.localStorage.removeItem(fallbackKey);
      return { state: migrated, backend: await repository.backendKind() };
    }
    return { state: emptyState(), backend };
  } catch {
    return { state: emptyState(), backend: "memory" };
  }
}

async function writeState(state: AppState): Promise<StorageBackendKind> {
  await repository.replaceAll(appStateToDataStore(state));
  return repository.backendKind();
}

type ImportPreview = {
  state: AppState;
  counts: Record<string, number>;
  exportedAt?: string;
  settingsUpdatedAt?: string;
};

export type RoutineInput = {
  id?: string;
  title: string;
  section: DaySection;
  time?: string;
  weekdays: number[];
  steps: Array<{ id?: string; title: string }>;
  enabled?: boolean;
};

export type WeekPlanInput = {
  id?: string;
  weekKey: string;
  focus: string;
  outcomes: string[];
  backlog: Array<{
    id?: string;
    title: string;
    status?: WeekBacklogItem["status"];
    scheduledDate?: string;
    completedAt?: string;
  }>;
};

type AppStoreValue = {
  state: AppState;
  ready: boolean;
  storageFallback: boolean;
  todayPlan?: DailyPlan;
  activeFocus?: FocusSession;
  activeMeditation?: MeditationSession;
  completeOnboarding: (settings: Partial<AppSettings>) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  restartOnboarding: () => void;
  savePlan: (plan: Omit<DailyPlan, "id" | "createdAt" | "updatedAt" | "schemaVersion">) => void;
  updatePlan: (updater: (plan: DailyPlan) => DailyPlan) => void;
  updatePlanForDate: (date: string, updater: (plan: DailyPlan) => DailyPlan) => void;
  addPlanTask: (date: string, input: { title: string; section: DaySection; plannedTime?: string }) => void;
  setTaskStatus: (date: string, taskId: string, status: PlannerItemStatus) => void;
  deferTask: (date: string, taskId: string, targetDate?: string) => void;
  upsertRoutine: (input: RoutineInput) => void;
  deleteRoutine: (id: string) => void;
  toggleRoutineEnabled: (id: string) => void;
  ensureRoutineInstances: (date: string) => void;
  toggleRoutineStep: (instanceId: string, stepId: string) => void;
  setRoutineSkipped: (instanceId: string, skipped: boolean) => void;
  saveWeekPlan: (input: WeekPlanInput) => void;
  scheduleWeekItem: (weekPlanId: string, itemId: string, date: string) => void;
  toggleWeekItem: (weekPlanId: string, itemId: string) => void;
  startFocus: (input: { task: string; taskId?: string; expectedOutcome: string; durationMinutes: number }) => string;
  updateFocus: (id: string, patch: Partial<FocusSession>) => void;
  pauseFocus: (id: string) => void;
  resumeFocus: (id: string) => void;
  endFocus: (id: string) => void;
  completeFocus: (id: string, patch: Pick<FocusSession, "result" | "nextStep" | "bodyCheck">) => void;
  startMeditation: (durationMinutes: number, focus?: string) => string;
  updateMeditation: (id: string, patch: Partial<MeditationSession>) => void;
  pauseMeditation: (id: string) => void;
  resumeMeditation: (id: string) => void;
  endMeditation: (id: string) => void;
  completeMeditation: (id: string, presence: MeditationSession["presence"], note?: string) => void;
  saveReset: (session: Omit<ResetSession, "id" | "createdAt" | "updatedAt" | "schemaVersion">) => void;
  saveWeeklyReview: (review: Omit<WeeklyReview, "id" | "createdAt" | "updatedAt" | "schemaVersion">) => void;
  savePattern: (entry: Omit<PatternEntry, "id" | "createdAt" | "updatedAt" | "schemaVersion">) => void;
  exportJson: () => string;
  previewImport: (text: string) => ImportPreview;
  applyImport: (preview: ImportPreview, mode: "replace" | "merge") => void;
  clearAll: () => Promise<void>;
};

const AppStoreContext = createContext<AppStoreValue | null>(null);

const mergeById = <T extends { id: string; updatedAt: string }>(current: T[], incoming: T[]) => {
  const merged = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) {
    const previous = merged.get(item.id);
    if (!previous || item.updatedAt > previous.updatedAt) merged.set(item.id, item);
  }
  return [...merged.values()];
};

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => emptyState());
  const [ready, setReady] = useState(false);
  const [storageFallback, setStorageFallback] = useState(false);

  useEffect(() => {
    let current = true;
    readState().then(({ state: loaded, backend }) => {
      if (!current) return;
      setState(loaded);
      setStorageFallback(backend !== "indexedDB");
      setReady(true);
    });
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    // Mutations already carry their logical timestamp. Persisting a newer,
    // state-external timestamp here would make this tab receive its own write
    // as a newer state and could create a BroadcastChannel write loop.
    const next = state;
    writeState(next)
      .then((backend) => {
        setStorageFallback(backend !== "indexedDB");
        const channel = typeof BroadcastChannel !== "undefined"
          ? new BroadcastChannel("inner-compass-sync")
          : null;
        channel?.postMessage({ type: "updated", updatedAt: next.updatedAt });
        channel?.close();
      })
      .catch(() => setStorageFallback(true));
  }, [state, ready]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("inner-compass-sync");
    channel.onmessage = () => {
      readState().then(({ state: incoming, backend }) => {
        setStorageFallback(backend !== "indexedDB");
        setState((current) => incoming.updatedAt > current.updatedAt ? incoming : current);
      });
    };
    return () => channel.close();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const preference = state.settings.theme;
    const resolved = preference === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : preference;
    root.dataset.theme = resolved;
    root.dataset.themePreference = preference;
    root.style.colorScheme = resolved;
    try {
      window.localStorage.setItem("inner-compass-theme", preference);
    } catch {
      // The preference still applies for the current session.
    }
  }, [state.settings.theme]);

  const mutate = useCallback((fn: (current: AppState) => AppState) => {
    setState((current) => ({ ...fn(current), updatedAt: nowIso() }));
  }, []);

  const todayPlan = useMemo(
    () => state.plans.find((plan) => plan.date === localDateKey()),
    [state.plans],
  );
  const activeFocus = state.focusSessions.find((session) => session.id === state.activeFocusId);
  const activeMeditation = state.meditationSessions.find(
    (session) => session.id === state.activeMeditationId,
  );

  const value = useMemo<AppStoreValue>(() => ({
    state,
    ready,
    storageFallback,
    todayPlan,
    activeFocus,
    activeMeditation,
    completeOnboarding(settings) {
      mutate((current) => {
        const nextSettings = { ...current.settings, ...settings };
        return {
          ...current,
          onboardingComplete: true,
          settings: {
            ...nextSettings,
            movementCategories: normalizeMovementCategories(nextSettings.movementCategories),
            identity: normalizeIdentityProfile(nextSettings.identity),
          },
        };
      });
    },
    updateSettings(settings) {
      mutate((current) => {
        const nextSettings = { ...current.settings, ...settings };
        return {
          ...current,
          settings: {
            ...nextSettings,
            movementCategories: normalizeMovementCategories(nextSettings.movementCategories),
            identity: normalizeIdentityProfile(nextSettings.identity),
          },
        };
      });
    },
    restartOnboarding() {
      mutate((current) => ({ ...current, onboardingComplete: false }));
    },
    savePlan(plan) {
      const timestamp = nowIso();
      mutate((current) => {
        const existing = current.plans.find((item) => item.date === plan.date);
        const saved: DailyPlan = {
          ...plan,
          mainTask: normalizeTask({
            ...plan.mainTask,
            plannedTime: plan.mainTask.plannedTime ?? plan.startTime,
          }),
          secondaryTasks: plan.secondaryTasks.map(normalizeTask),
          id: existing?.id ?? newId(),
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp,
          schemaVersion: APP_SCHEMA_VERSION,
          timezone: plan.timezone ?? current.settings.timezone,
        };
        const movementCategory = plan.bodyActivity?.trim();
        const movementCategories = movementCategory
          && !current.settings.movementCategories.some(
            (category) => category.toLocaleLowerCase() === movementCategory.toLocaleLowerCase(),
          )
          ? normalizeMovementCategories([...current.settings.movementCategories, movementCategory])
          : current.settings.movementCategories;
        return {
          ...current,
          settings: { ...current.settings, movementCategories },
          plans: [...current.plans.filter((item) => item.date !== saved.date), saved],
        };
      });
    },
    updatePlan(updater) {
      mutate((current) => ({
        ...current,
        plans: current.plans.map((plan) =>
          plan.date === localDateKey()
            ? { ...updater(plan), updatedAt: nowIso() }
            : plan,
        ),
      }));
    },
    updatePlanForDate(date, updater) {
      mutate((current) => ({
        ...current,
        plans: current.plans.map((plan) =>
          plan.date === date
            ? { ...updater(plan), updatedAt: nowIso() }
            : plan,
        ),
      }));
    },
    addPlanTask(date, input) {
      const title = input.title.trim();
      if (!title) return;
      const timestamp = nowIso();
      mutate((current) => {
        const existing = current.plans.find((plan) => plan.date === date);
        const task: Task = {
          id: newId(),
          title,
          completed: false,
          status: "open",
          section: input.section,
          plannedTime: input.plannedTime || undefined,
        };
        if (!existing) {
          const created: DailyPlan = {
            id: newId(),
            date,
            mainTask: task,
            nextStep: "",
            secondaryTasks: [],
            bodyCompleted: false,
            meditationSkipped: true,
            meditationCompleted: false,
            courageousCompleted: false,
            startTime: input.plannedTime || undefined,
            createdAt: timestamp,
            updatedAt: timestamp,
            schemaVersion: APP_SCHEMA_VERSION,
            timezone: current.settings.timezone,
          };
          return { ...current, plans: [...current.plans, created] };
        }
        if (existing.secondaryTasks.length >= 30) return current;
        return {
          ...current,
          plans: current.plans.map((plan) =>
            plan.date === date
              ? { ...plan, secondaryTasks: [...plan.secondaryTasks, task], updatedAt: timestamp }
              : plan,
          ),
        };
      });
    },
    setTaskStatus(date, taskId, status) {
      const timestamp = nowIso();
      const updateTask = (task: Task): Task => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          status,
          completed: status === "completed",
          completedAt: status === "completed" ? timestamp : undefined,
          skippedAt: status === "skipped" ? timestamp : undefined,
          deferredAt: status === "deferred" ? task.deferredAt ?? timestamp : undefined,
          deferredTo: status === "deferred" ? task.deferredTo : undefined,
        };
      };
      mutate((current) => ({
        ...current,
        plans: current.plans.map((plan) =>
          plan.date === date
            ? {
                ...plan,
                mainTask: updateTask(plan.mainTask),
                secondaryTasks: plan.secondaryTasks.map(updateTask),
                updatedAt: timestamp,
              }
            : plan,
        ),
      }));
    },
    deferTask(date, taskId, targetDate = shiftLocalDate(date, 1)) {
      if (targetDate <= date) return;
      const timestamp = nowIso();
      mutate((current) => {
        const sourcePlan = current.plans.find((plan) => plan.date === date);
        if (!sourcePlan) return current;
        const sourceTask = sourcePlan.mainTask.id === taskId
          ? sourcePlan.mainTask
          : sourcePlan.secondaryTasks.find((task) => task.id === taskId);
        if (!sourceTask) return current;
        if (resolvedTaskStatus(sourceTask) === "deferred" && sourceTask.deferredTo === targetDate) {
          return current;
        }
        const originTaskId = sourceTask.originTaskId ?? sourceTask.id;
        const targetPlan = current.plans.find((plan) => plan.date === targetDate);
        const targetTasks = targetPlan
          ? [targetPlan.mainTask, ...targetPlan.secondaryTasks]
          : [];
        const alreadyCarried = targetTasks.some(
          (task) => task.originTaskId === originTaskId || task.id === originTaskId,
        );
        if (targetPlan && targetPlan.secondaryTasks.length >= 30 && !alreadyCarried) return current;

        const carriedTask: Task = {
          ...sourceTask,
          id: newId(),
          completed: false,
          completedAt: undefined,
          status: "open",
          skippedAt: undefined,
          deferredAt: undefined,
          deferredTo: undefined,
          originTaskId,
        };
        const deferSource = (task: Task): Task => task.id === taskId
          ? {
              ...task,
              completed: false,
              completedAt: undefined,
              status: "deferred",
              skippedAt: undefined,
              deferredAt: timestamp,
              deferredTo: targetDate,
            }
          : task;
        const plans = current.plans.map((plan) =>
          plan.date === date
            ? {
                ...plan,
                mainTask: deferSource(plan.mainTask),
                secondaryTasks: plan.secondaryTasks.map(deferSource),
                updatedAt: timestamp,
              }
            : plan,
        );

        if (alreadyCarried) return { ...current, plans };
        if (targetPlan) {
          return {
            ...current,
            plans: plans.map((plan) =>
              plan.date === targetDate
                ? { ...plan, secondaryTasks: [...plan.secondaryTasks, carriedTask], updatedAt: timestamp }
                : plan,
            ),
          };
        }
        const created: DailyPlan = {
          id: newId(),
          date: targetDate,
          mainTask: carriedTask,
          nextStep: sourcePlan.mainTask.id === taskId ? sourcePlan.nextStep : "",
          secondaryTasks: [],
          bodyCompleted: false,
          meditationSkipped: true,
          meditationCompleted: false,
          courageousCompleted: false,
          startTime: carriedTask.plannedTime,
          createdAt: timestamp,
          updatedAt: timestamp,
          schemaVersion: APP_SCHEMA_VERSION,
          timezone: current.settings.timezone,
        };
        return { ...current, plans: [...plans, created] };
      });
    },
    upsertRoutine(input) {
      const timestamp = nowIso();
      mutate((current) => {
        const existing = input.id
          ? current.routines.find((routine) => routine.id === input.id)
          : undefined;
        const saved: RoutineTemplate = {
          id: existing?.id ?? newId(),
          title: input.title.trim(),
          section: input.section,
          time: input.time || undefined,
          weekdays: [...new Set(input.weekdays)].sort((left, right) => left - right),
          steps: input.steps
            .map((step) => ({ id: step.id ?? newId(), title: step.title.trim() }))
            .filter((step) => step.title)
            .slice(0, 6),
          enabled: input.enabled ?? existing?.enabled ?? true,
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp,
          schemaVersion: APP_SCHEMA_VERSION,
          timezone: existing?.timezone ?? current.settings.timezone,
        };
        return {
          ...current,
          routines: [...current.routines.filter((routine) => routine.id !== saved.id), saved],
        };
      });
    },
    deleteRoutine(id) {
      mutate((current) => ({
        ...current,
        routines: current.routines.filter((routine) => routine.id !== id),
        routineInstances: current.routineInstances.filter((instance) =>
          !(
            instance.routineId === id
            && instance.date >= localDateKey()
            && instance.status === "active"
            && instance.steps.every((step) => !step.completed)
          ),
        ),
      }));
    },
    toggleRoutineEnabled(id) {
      const timestamp = nowIso();
      mutate((current) => {
        const routine = current.routines.find((item) => item.id === id);
        const disabling = routine?.enabled ?? false;
        return {
          ...current,
          routines: current.routines.map((item) =>
            item.id === id
              ? { ...item, enabled: !item.enabled, updatedAt: timestamp }
              : item,
          ),
          routineInstances: disabling
            ? current.routineInstances.filter((instance) =>
                !(
                  instance.routineId === id
                  && instance.date >= localDateKey()
                  && instance.status === "active"
                  && instance.steps.every((step) => !step.completed)
                ),
              )
            : current.routineInstances,
        };
      });
    },
    ensureRoutineInstances(date) {
      const timestamp = nowIso();
      const weekday = new Date(`${date}T12:00:00`).getDay();
      setState((current) => {
        const existing = new Set(
          current.routineInstances
            .filter((instance) => instance.date === date)
            .map((instance) => instance.routineId),
        );
        const additions = current.routines
          .filter((routine) => routine.enabled && routine.weekdays.includes(weekday) && !existing.has(routine.id))
          .map<RoutineInstance>((routine) => ({
            id: newId(),
            routineId: routine.id,
            date,
            title: routine.title,
            section: routine.section,
            time: routine.time,
            status: "active",
            steps: routine.steps.map((step) => ({
              id: newId(),
              sourceStepId: step.id,
              title: step.title,
              completed: false,
            })),
            createdAt: timestamp,
            updatedAt: timestamp,
            schemaVersion: APP_SCHEMA_VERSION,
            timezone: current.settings.timezone,
          }));
        if (!additions.length) return current;
        return {
          ...current,
          routineInstances: [...current.routineInstances, ...additions],
          updatedAt: timestamp,
        };
      });
    },
    toggleRoutineStep(instanceId, stepId) {
      const timestamp = nowIso();
      mutate((current) => ({
        ...current,
        routineInstances: current.routineInstances.map((instance) =>
          instance.id === instanceId
            ? {
                ...instance,
                status: "active",
                skippedAt: undefined,
                steps: instance.steps.map((step) =>
                  step.id === stepId
                    ? {
                        ...step,
                        completed: !step.completed,
                        completedAt: !step.completed ? timestamp : undefined,
                      }
                    : step,
                ),
                updatedAt: timestamp,
              }
            : instance,
        ),
      }));
    },
    setRoutineSkipped(instanceId, skipped) {
      const timestamp = nowIso();
      mutate((current) => ({
        ...current,
        routineInstances: current.routineInstances.map((instance) =>
          instance.id === instanceId
            ? {
                ...instance,
                status: skipped ? "skipped" : "active",
                skippedAt: skipped ? timestamp : undefined,
                updatedAt: timestamp,
              }
            : instance,
        ),
      }));
    },
    saveWeekPlan(input) {
      const timestamp = nowIso();
      mutate((current) => {
        const existing = current.weekPlans.find((plan) =>
          input.id ? plan.id === input.id : plan.weekKey === input.weekKey,
        );
        const saved: WeekPlan = {
          id: existing?.id ?? input.id ?? newId(),
          weekKey: input.weekKey,
          focus: input.focus.trim(),
          outcomes: input.outcomes.map((outcome) => outcome.trim()).filter(Boolean).slice(0, 3),
          backlog: input.backlog
            .map((item) => ({
              id: item.id ?? newId(),
              title: item.title.trim(),
              status: item.status ?? "open",
              scheduledDate: item.scheduledDate,
              completedAt: item.completedAt,
            }))
            .filter((item) => item.title)
            .slice(0, 30),
          createdAt: existing?.createdAt ?? timestamp,
          updatedAt: timestamp,
          schemaVersion: APP_SCHEMA_VERSION,
          timezone: existing?.timezone ?? current.settings.timezone,
        };
        return {
          ...current,
          weekPlans: [...current.weekPlans.filter((plan) => plan.id !== saved.id), saved],
        };
      });
    },
    scheduleWeekItem(weekPlanId, itemId, date) {
      const timestamp = nowIso();
      mutate((current) => {
        const weekPlan = current.weekPlans.find((plan) => plan.id === weekPlanId);
        const item = weekPlan?.backlog.find((entry) => entry.id === itemId);
        if (!weekPlan || !item) return current;
        const targetPlan = current.plans.find((plan) => plan.date === date);
        const targetTasks = targetPlan ? [targetPlan.mainTask, ...targetPlan.secondaryTasks] : [];
        const alreadyScheduled = targetTasks.some((task) => task.originTaskId === item.id);
        if (targetPlan && targetPlan.secondaryTasks.length >= 30 && !alreadyScheduled) return current;
        let plans = current.plans;
        if (!alreadyScheduled) {
          const task: Task = {
            id: newId(),
            title: item.title,
            completed: false,
            status: "open",
            section: "day",
            originTaskId: item.id,
          };
          if (targetPlan) {
            plans = current.plans.map((plan) =>
              plan.date === date
                ? { ...plan, secondaryTasks: [...plan.secondaryTasks, task], updatedAt: timestamp }
                : plan,
            );
          } else {
            plans = [...current.plans, {
              id: newId(),
              date,
              mainTask: task,
              nextStep: "",
              secondaryTasks: [],
              bodyCompleted: false,
              meditationSkipped: true,
              meditationCompleted: false,
              courageousCompleted: false,
              createdAt: timestamp,
              updatedAt: timestamp,
              schemaVersion: APP_SCHEMA_VERSION,
              timezone: current.settings.timezone,
            }];
          }
        }
        return {
          ...current,
          plans,
          weekPlans: current.weekPlans.map((plan) =>
            plan.id === weekPlanId
              ? {
                  ...plan,
                  backlog: plan.backlog.map((entry) =>
                    entry.id === itemId
                      ? { ...entry, status: "scheduled", scheduledDate: date, completedAt: undefined }
                      : entry,
                  ),
                  updatedAt: timestamp,
                }
              : plan,
          ),
        };
      });
    },
    toggleWeekItem(weekPlanId, itemId) {
      const timestamp = nowIso();
      mutate((current) => ({
        ...current,
        weekPlans: current.weekPlans.map((plan) =>
          plan.id === weekPlanId
            ? {
                ...plan,
                backlog: plan.backlog.map((item) => {
                  if (item.id !== itemId) return item;
                  const completed = item.status !== "completed";
                  return {
                    ...item,
                    status: completed ? "completed" : item.scheduledDate ? "scheduled" : "open",
                    completedAt: completed ? timestamp : undefined,
                  };
                }),
                updatedAt: timestamp,
              }
            : plan,
        ),
      }));
    },
    startFocus(input) {
      const id = newId();
      const started = new Date();
      const session: FocusSession = {
        id,
        ...input,
        startedAt: started.toISOString(),
        plannedEndAt: new Date(started.getTime() + input.durationMinutes * 60_000).toISOString(),
        totalPausedMs: 0,
        status: "running",
        createdAt: started.toISOString(),
        updatedAt: started.toISOString(),
        schemaVersion: APP_SCHEMA_VERSION,
        timezone: state.settings.timezone,
      };
      mutate((current) => ({
        ...current,
        focusSessions: [...current.focusSessions, session],
        activeFocusId: id,
      }));
      return id;
    },
    updateFocus(id, patch) {
      mutate((current) => ({
        ...current,
        focusSessions: current.focusSessions.map((item) =>
          item.id === id ? { ...item, ...patch, updatedAt: nowIso() } : item,
        ),
      }));
    },
    pauseFocus(id) {
      const pausedAt = nowIso();
      mutate((current) => ({
        ...current,
        focusSessions: current.focusSessions.map((item) =>
          item.id === id && item.status === "running"
            ? { ...item, pausedAt, status: "paused", updatedAt: pausedAt }
            : item,
        ),
      }));
    },
    resumeFocus(id) {
      const resumedAt = new Date();
      mutate((current) => ({
        ...current,
        focusSessions: current.focusSessions.map((item) => {
          if (item.id !== id || item.status !== "paused" || !item.pausedAt) return item;
          const pauseMs = resumedAt.getTime() - new Date(item.pausedAt).getTime();
          return {
            ...item,
            pausedAt: undefined,
            status: "running",
            totalPausedMs: item.totalPausedMs + pauseMs,
            plannedEndAt: new Date(new Date(item.plannedEndAt).getTime() + pauseMs).toISOString(),
            updatedAt: resumedAt.toISOString(),
          };
        }),
      }));
    },
    endFocus(id) {
      const ended = new Date();
      const endedAt = ended.toISOString();
      mutate((current) => ({
        ...current,
        focusSessions: current.focusSessions.map((item) => {
          if (item.id !== id) return item;
          const finalPauseMs = item.pausedAt
            ? Math.max(0, ended.getTime() - new Date(item.pausedAt).getTime())
            : 0;
          return {
            ...item,
            endedAt,
            pausedAt: undefined,
            totalPausedMs: item.totalPausedMs + finalPauseMs,
            status: "review",
            updatedAt: endedAt,
          };
        }),
      }));
    },
    completeFocus(id, patch) {
      mutate((current) => ({
        ...current,
        focusSessions: current.focusSessions.map((item) =>
          item.id === id
            ? { ...item, ...patch, endedAt: item.endedAt ?? nowIso(), status: "completed", updatedAt: nowIso() }
            : item,
        ),
        activeFocusId: current.activeFocusId === id ? undefined : current.activeFocusId,
        plans: current.plans.map((plan) => {
          const session = current.focusSessions.find((item) => item.id === id);
          if (plan.date !== localDateKey() || !session?.taskId) return plan;
          if (session.result !== "yes" && patch.result !== "yes") return plan;
          if (plan.mainTask.id === session.taskId) {
            return {
              ...plan,
              mainTask: {
                ...plan.mainTask,
                completed: true,
                completedAt: nowIso(),
                status: "completed",
              },
            };
          }
          return {
            ...plan,
            secondaryTasks: plan.secondaryTasks.map((task) =>
              task.id === session.taskId
                ? { ...task, completed: true, completedAt: nowIso(), status: "completed" }
                : task,
            ),
          };
        }),
      }));
    },
    startMeditation(durationMinutes, focus) {
      const id = newId();
      const started = new Date();
      const session: MeditationSession = {
        id,
        durationMinutes,
        focus,
        startedAt: started.toISOString(),
        plannedEndAt: new Date(started.getTime() + durationMinutes * 60_000).toISOString(),
        totalPausedMs: 0,
        status: "running",
        createdAt: started.toISOString(),
        updatedAt: started.toISOString(),
        schemaVersion: APP_SCHEMA_VERSION,
        timezone: state.settings.timezone,
      };
      mutate((current) => ({
        ...current,
        meditationSessions: [...current.meditationSessions, session],
        activeMeditationId: id,
      }));
      return id;
    },
    updateMeditation(id, patch) {
      mutate((current) => ({
        ...current,
        meditationSessions: current.meditationSessions.map((item) =>
          item.id === id ? { ...item, ...patch, updatedAt: nowIso() } : item,
        ),
      }));
    },
    pauseMeditation(id) {
      const pausedAt = nowIso();
      mutate((current) => ({
        ...current,
        meditationSessions: current.meditationSessions.map((item) =>
          item.id === id && item.status === "running"
            ? { ...item, pausedAt, status: "paused", updatedAt: pausedAt }
            : item,
        ),
      }));
    },
    resumeMeditation(id) {
      const resumedAt = new Date();
      mutate((current) => ({
        ...current,
        meditationSessions: current.meditationSessions.map((item) => {
          if (item.id !== id || item.status !== "paused" || !item.pausedAt) return item;
          const pauseMs = resumedAt.getTime() - new Date(item.pausedAt).getTime();
          return {
            ...item,
            pausedAt: undefined,
            status: "running",
            totalPausedMs: item.totalPausedMs + pauseMs,
            plannedEndAt: new Date(new Date(item.plannedEndAt).getTime() + pauseMs).toISOString(),
            updatedAt: resumedAt.toISOString(),
          };
        }),
      }));
    },
    endMeditation(id) {
      const ended = new Date();
      const endedAt = ended.toISOString();
      mutate((current) => ({
        ...current,
        meditationSessions: current.meditationSessions.map((item) => {
          if (item.id !== id) return item;
          const finalPauseMs = item.pausedAt
            ? Math.max(0, ended.getTime() - new Date(item.pausedAt).getTime())
            : 0;
          return {
            ...item,
            endedAt,
            pausedAt: undefined,
            totalPausedMs: item.totalPausedMs + finalPauseMs,
            status: "review",
            updatedAt: endedAt,
          };
        }),
      }));
    },
    completeMeditation(id, presence, note) {
      const completedAt = nowIso();
      mutate((current) => ({
        ...current,
        meditationSessions: current.meditationSessions.map((item) =>
          item.id === id
            ? {
                ...item,
                presence,
                note,
                endedAt: item.endedAt ?? completedAt,
                status: "completed",
                updatedAt: completedAt,
              }
            : item,
        ),
        activeMeditationId: current.activeMeditationId === id ? undefined : current.activeMeditationId,
        plans: current.plans.map((plan) =>
          plan.date === localDateKey()
            ? {
                ...plan,
                meditationCompleted: true,
                meditationCompletedAt: plan.meditationCompletedAt ?? completedAt,
                updatedAt: completedAt,
              }
            : plan,
        ),
      }));
    },
    saveReset(session) {
      const timestamp = nowIso();
      const saved: ResetSession = {
        ...session,
        id: newId(),
        createdAt: timestamp,
        updatedAt: timestamp,
        schemaVersion: APP_SCHEMA_VERSION,
        timezone: state.settings.timezone,
      };
      mutate((current) => ({ ...current, resetSessions: [...current.resetSessions, saved] }));
    },
    saveWeeklyReview(review) {
      const timestamp = nowIso();
      const saved: WeeklyReview = {
        ...review,
        id: newId(),
        createdAt: timestamp,
        updatedAt: timestamp,
        schemaVersion: APP_SCHEMA_VERSION,
        timezone: state.settings.timezone,
      };
      mutate((current) => ({
        ...current,
        weeklyReviews: [
          ...current.weeklyReviews.filter((item) => item.weekKey !== review.weekKey),
          saved,
        ],
      }));
    },
    savePattern(entry) {
      const timestamp = nowIso();
      const saved: PatternEntry = {
        ...entry,
        id: newId(),
        createdAt: timestamp,
        updatedAt: timestamp,
        schemaVersion: APP_SCHEMA_VERSION,
        timezone: state.settings.timezone,
      };
      mutate((current) => ({ ...current, patternEntries: [...current.patternEntries, saved] }));
    },
    exportJson() {
      return serializeDataExport(createDataExport(appStateToDataStore(state), {
        appVersion: "0.1.0",
      }));
    },
    previewImport(text) {
      const envelope = parseDataImport(text);
      const domainCounts = previewDataImport(envelope);
      const settingsUpdatedAt = envelope.data.appSettings
        .map((settings) => settings.updatedAt)
        .sort()
        .at(-1);
      return {
        state: normalizeState(dataStoreToAppState(envelope.data)),
        exportedAt: envelope.exportedAt,
        settingsUpdatedAt,
        counts: {
          plans: domainCounts.dailyPlans,
          focusSessions: domainCounts.focusSessions,
          meditationSessions: domainCounts.meditationSessions,
          resetSessions: domainCounts.resetSessions,
          weeklyReviews: domainCounts.weeklyReviews,
          patternEntries: domainCounts.patternEntries,
          routines: domainCounts.routines,
          routineInstances: domainCounts.routineInstances,
          weekPlans: domainCounts.weekPlans,
        },
      };
    },
    applyImport(preview, mode) {
      mutate((current) => {
        if (mode === "replace") return { ...preview.state, key: "app" };
        const incomingSettingsAreNewer = preview.settingsUpdatedAt !== undefined
          && new Date(preview.settingsUpdatedAt).getTime() > new Date(current.updatedAt).getTime();
        return {
          ...current,
          settings: incomingSettingsAreNewer ? preview.state.settings : current.settings,
          onboardingComplete: current.onboardingComplete || preview.state.onboardingComplete,
          plans: mergeById(current.plans, preview.state.plans),
          focusSessions: mergeById(current.focusSessions, preview.state.focusSessions),
          meditationSessions: mergeById(current.meditationSessions, preview.state.meditationSessions),
          resetSessions: mergeById(current.resetSessions, preview.state.resetSessions),
          weeklyReviews: mergeById(current.weeklyReviews, preview.state.weeklyReviews),
          patternEntries: mergeById(current.patternEntries, preview.state.patternEntries),
          routines: mergeById(current.routines, preview.state.routines),
          routineInstances: mergeById(current.routineInstances, preview.state.routineInstances),
          weekPlans: mergeById(current.weekPlans, preview.state.weekPlans),
          activeFocusId: undefined,
          activeMeditationId: undefined,
        };
      });
    },
    async clearAll() {
      const cleared = emptyState();
      setState(cleared);
      await repository.clearAll();
      window.localStorage.removeItem(fallbackKey);
    },
  }), [state, ready, storageFallback, todayPlan, activeFocus, activeMeditation, mutate]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error("useAppStore must be used within AppStoreProvider");
  return store;
}

export function remainingMilliseconds(
  session: Pick<FocusSession | MeditationSession, "plannedEndAt" | "pausedAt" | "status">,
  at = Date.now(),
) {
  const reference = session.status === "paused" && session.pausedAt
    ? new Date(session.pausedAt).getTime()
    : at;
  return Math.max(0, new Date(session.plannedEndAt).getTime() - reference);
}

export function formatClock(milliseconds: number) {
  const total = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
