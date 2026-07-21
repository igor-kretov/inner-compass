import type { PersistedTimerFields } from "../entities";

export type EffectiveTimerStatus = PersistedTimerFields["status"] | "elapsed";

export interface TimerSnapshot {
  persistedStatus: PersistedTimerFields["status"];
  effectiveStatus: EffectiveTimerStatus;
  elapsedSeconds: number;
  remainingSeconds: number;
  progress: number;
  shouldPersistCompletion: boolean;
}

function instant(value: string | Date): Date {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new RangeError("Ungültiger Timer-Zeitpunkt.");
  return parsed;
}

export function createPersistedTimer(
  plannedDurationSeconds: number,
  now: Date = new Date(),
): PersistedTimerFields {
  if (!Number.isInteger(plannedDurationSeconds) || plannedDurationSeconds < 1 || plannedDurationSeconds > 7_200) {
    throw new RangeError("Die Timerdauer muss zwischen 1 und 7200 Sekunden liegen.");
  }
  const startedAt = now.toISOString();
  return {
    status: "running",
    plannedDurationSeconds,
    startedAt,
    plannedEndAt: new Date(now.getTime() + plannedDurationSeconds * 1_000).toISOString(),
    pausedAt: null,
    accumulatedPausedMs: 0,
    endedAt: null,
  };
}

export function calculateActiveDurationMs(
  timer: PersistedTimerFields,
  now: Date = new Date(),
): number {
  const startedAt = instant(timer.startedAt).getTime();
  let effectiveEnd = now.getTime();

  if (timer.endedAt) effectiveEnd = instant(timer.endedAt).getTime();
  else if (timer.status === "paused" && timer.pausedAt) {
    effectiveEnd = instant(timer.pausedAt).getTime();
  }

  const rawActiveMs = Math.max(0, effectiveEnd - startedAt - timer.accumulatedPausedMs);
  return Math.min(rawActiveMs, timer.plannedDurationSeconds * 1_000);
}

export function calculateFocusDurationSeconds(
  timer: PersistedTimerFields,
  now: Date = new Date(),
): number {
  return Math.floor(calculateActiveDurationMs(timer, now) / 1_000);
}

export function reconstructTimer(
  timer: PersistedTimerFields,
  now: Date = new Date(),
): TimerSnapshot {
  const duration = timer.plannedDurationSeconds;
  const elapsedSeconds = calculateFocusDurationSeconds(timer, now);
  const remainingSeconds = Math.max(0, duration - elapsedSeconds);
  const terminal =
    timer.status === "review" || timer.status === "completed" || timer.status === "cancelled";
  const effectiveStatus =
    !terminal && timer.status === "running" && remainingSeconds === 0
      ? "elapsed"
      : timer.status;

  return {
    persistedStatus: timer.status,
    effectiveStatus,
    elapsedSeconds,
    remainingSeconds,
    progress: duration === 0 ? 1 : Math.min(1, elapsedSeconds / duration),
    shouldPersistCompletion: effectiveStatus === "elapsed",
  };
}

export function pauseTimer<T extends PersistedTimerFields>(
  timer: T,
  now: Date = new Date(),
): T {
  if (timer.status !== "running") return timer;
  return {
    ...timer,
    status: "paused",
    pausedAt: now.toISOString(),
  };
}

export function resumeTimer<T extends PersistedTimerFields>(
  timer: T,
  now: Date = new Date(),
): T {
  if (timer.status !== "paused" || !timer.pausedAt) return timer;
  const pausedForMs = Math.max(0, now.getTime() - instant(timer.pausedAt).getTime());
  return {
    ...timer,
    status: "running",
    pausedAt: null,
    accumulatedPausedMs: timer.accumulatedPausedMs + pausedForMs,
    plannedEndAt: new Date(instant(timer.plannedEndAt).getTime() + pausedForMs).toISOString(),
  };
}

export function finishTimer<T extends PersistedTimerFields>(
  timer: T,
  status: "completed" | "cancelled",
  now: Date = new Date(),
): T {
  let accumulatedPausedMs = timer.accumulatedPausedMs;
  if (timer.status === "paused" && timer.pausedAt) {
    accumulatedPausedMs += Math.max(0, now.getTime() - instant(timer.pausedAt).getTime());
  }
  return {
    ...timer,
    status,
    pausedAt: null,
    accumulatedPausedMs,
    endedAt: now.toISOString(),
  };
}
