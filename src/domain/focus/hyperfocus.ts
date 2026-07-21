import type { FocusSession } from "../entities";
import { calculateFocusDurationSeconds } from "./timer";

export const HYPERFOCUS_BREAK_OPTIONS = [
  "walk",
  "water",
  "eat",
  "mobility",
  "continue-consciously",
] as const;

export interface HyperfocusConfig {
  consecutiveBlocks: number;
  maxGapMinutes: number;
  rollingWindowMinutes: number;
  focusMinutesInWindow: number;
}

export const DEFAULT_HYPERFOCUS_CONFIG: HyperfocusConfig = {
  consecutiveBlocks: 2,
  maxGapMinutes: 15,
  rollingWindowMinutes: 240,
  focusMinutesInWindow: 120,
};

export interface HyperfocusEvaluation {
  requiresBreak: boolean;
  reasons: Array<"consecutive-blocks" | "focus-time">;
  consecutiveCount: number;
  focusMinutesInWindow: number;
  message: string | null;
  options: typeof HYPERFOCUS_BREAK_OPTIONS;
}

function endTime(session: FocusSession): number {
  return new Date(session.endedAt ?? session.plannedEndAt).getTime();
}

export function evaluateHyperfocusProtection(
  sessions: readonly FocusSession[],
  now: Date = new Date(),
  config: HyperfocusConfig = DEFAULT_HYPERFOCUS_CONFIG,
): HyperfocusEvaluation {
  const latestAcknowledgement = sessions.reduce((latest, session) => {
    if (!session.hyperfocusAcknowledgedAt) return latest;
    return Math.max(latest, new Date(session.hyperfocusAcknowledgedAt).getTime());
  }, Number.NEGATIVE_INFINITY);
  const windowStart = now.getTime() - config.rollingWindowMinutes * 60_000;

  const relevant = sessions
    .filter((session) => session.status === "completed" && session.endedAt)
    .filter((session) => endTime(session) >= windowStart)
    .filter((session) => new Date(session.startedAt).getTime() > latestAcknowledgement)
    .sort((left, right) => new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime());

  const focusSeconds = relevant.reduce(
    (sum, session) => sum + calculateFocusDurationSeconds(session, now),
    0,
  );

  let consecutiveCount = relevant.length > 0 ? 1 : 0;
  for (let index = relevant.length - 1; index > 0; index -= 1) {
    const gapMs =
      new Date(relevant[index].startedAt).getTime() - endTime(relevant[index - 1]);
    if (gapMs < 0 || gapMs > config.maxGapMinutes * 60_000) break;
    consecutiveCount += 1;
  }

  const focusMinutesInWindow = Math.floor(focusSeconds / 60);
  const reasons: HyperfocusEvaluation["reasons"] = [];
  if (consecutiveCount >= config.consecutiveBlocks) reasons.push("consecutive-blocks");
  if (focusSeconds >= config.focusMinutesInWindow * 60) reasons.push("focus-time");

  return {
    requiresBreak: reasons.length > 0,
    reasons,
    consecutiveCount,
    focusMinutesInWindow,
    message: reasons.length > 0 ? "Fokus ist wertvoll. Jetzt kurz zurück in den Körper." : null,
    options: HYPERFOCUS_BREAK_OPTIONS,
  };
}
