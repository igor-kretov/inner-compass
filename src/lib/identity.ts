import { getLocalDateKey, zonedDateTimeToInstant } from "@/lib/dates";

import type { AppState, IdentityProfile, Task } from "./app-store";

export type IdentityEvidenceType =
  | "task"
  | "focus"
  | "movement"
  | "meditation"
  | "courage"
  | "routine"
  | "rehearsal"
  | "reflection";

export type IdentityEvidence = {
  id: string;
  date: string;
  occurredAt: string;
  label: string;
  type: IdentityEvidenceType;
};

type EvidenceCandidate = IdentityEvidence & {
  dedupeKey: string;
  priority: number;
};

export function prepareIdentityProfile({
  current,
  statement,
  action,
  now = new Date().toISOString(),
}: {
  current?: IdentityProfile;
  statement: string;
  action?: string;
  now?: string;
}): IdentityProfile {
  const normalizedStatement = statement.trim();
  const normalizedAction = action?.trim() || undefined;
  const statementChanged = current?.statement.trim() !== normalizedStatement;

  return {
    statement: normalizedStatement,
    action: normalizedAction,
    startedAt: statementChanged ? now : current?.startedAt ?? now,
    reframe: statementChanged ? undefined : current?.reframe,
    rehearsalDates: statementChanged ? [] : current?.rehearsalDates ?? [],
  };
}

function validInstant(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function localDateFor(value: string, timeZone: string, fallback: string): string {
  try {
    return getLocalDateKey(value, timeZone);
  } catch {
    return fallback;
  }
}

function rehearsalInstant(date: string, timeZone: string, startedAt: string, startedDate: string) {
  if (date === startedDate) return startedAt;
  try {
    return zonedDateTimeToInstant(date, "12:00", timeZone).toISOString();
  } catch {
    return `${date}T12:00:00.000Z`;
  }
}

function taskCompleted(task: Task): boolean {
  return task.completed || task.status === "completed";
}

/**
 * Builds a calm, score-free evidence feed from records the app already owns.
 * Automatic evidence is deliberately not persisted, so reopening an item also
 * removes the corresponding evidence without a second source of truth.
 */
export function collectIdentityEvidence(state: AppState): IdentityEvidence[] {
  const identity = state.settings.identity;
  const startedAt = validInstant(identity?.startedAt);
  if (!identity || !startedAt) return [];

  const startedMs = new Date(startedAt).getTime();
  const timeZone = state.settings.timezone;
  const startedDate = localDateFor(startedAt, timeZone, startedAt.slice(0, 10));
  const candidates = new Map<string, EvidenceCandidate>();

  const add = (candidate: EvidenceCandidate) => {
    const occurredAt = validInstant(candidate.occurredAt);
    const label = candidate.label.trim();
    if (!occurredAt || !label || new Date(occurredAt).getTime() < startedMs) return;
    const normalized = { ...candidate, occurredAt, label };
    const current = candidates.get(candidate.dedupeKey);
    if (
      !current
      || normalized.priority > current.priority
      || (
        normalized.priority === current.priority
        && normalized.occurredAt > current.occurredAt
      )
    ) {
      candidates.set(candidate.dedupeKey, normalized);
    }
  };

  for (const plan of state.plans) {
    const planWithinIdentity = plan.date >= startedDate;
    for (const task of [plan.mainTask, ...plan.secondaryTasks]) {
      if (!taskCompleted(task)) continue;
      const occurredAt = validInstant(task.completedAt) ?? validInstant(plan.updatedAt);
      if (!occurredAt) continue;
      add({
        id: `task:${task.id}`,
        date: plan.date,
        occurredAt,
        label: `Aufgabe erledigt: ${task.title}`,
        type: "task",
        dedupeKey: `task:${task.id}`,
        priority: 100,
      });
    }

    if (planWithinIdentity && plan.bodyCompleted) {
      const occurredAt = validInstant(plan.bodyCompletedAt) ?? validInstant(plan.updatedAt);
      if (occurredAt) {
        add({
          id: `movement:${plan.id}`,
          date: plan.date,
          occurredAt,
          label: plan.bodyActivity ? `Bewegung: ${plan.bodyActivity}` : "Bewegung abgeschlossen",
          type: "movement",
          dedupeKey: `movement:${plan.id}`,
          priority: 70,
        });
      }
    }

    if (planWithinIdentity && plan.meditationCompleted) {
      const occurredAt = validInstant(plan.meditationCompletedAt) ?? validInstant(plan.updatedAt);
      if (occurredAt) {
        add({
          id: `meditation-plan:${plan.id}`,
          date: plan.date,
          occurredAt,
          label: "Meditation abgeschlossen",
          type: "meditation",
          dedupeKey: `meditation:${plan.date}`,
          priority: 60,
        });
      }
    }

    if (planWithinIdentity && plan.courageousCompleted) {
      const occurredAt = validInstant(plan.courageousCompletedAt) ?? validInstant(plan.updatedAt);
      if (occurredAt) {
        add({
          id: `courage:${plan.id}`,
          date: plan.date,
          occurredAt,
          label: plan.courageousAction
            ? `Mutige Handlung: ${plan.courageousAction}`
            : "Mutige Handlung abgeschlossen",
          type: "courage",
          dedupeKey: `courage:${plan.id}`,
          priority: 70,
        });
      }
    }

    const manualEvidence = plan.reflection?.identityEvidence?.trim();
    if (planWithinIdentity && manualEvidence && plan.reflection) {
      add({
        id: `reflection:${plan.id}`,
        date: plan.date,
        occurredAt: plan.reflection.completedAt,
        label: manualEvidence,
        type: "reflection",
        dedupeKey: `reflection:${plan.id}`,
        priority: 100,
      });
    }

  }

  for (const session of state.focusSessions) {
    if (session.status !== "completed") continue;
    const occurredAt = validInstant(session.endedAt) ?? validInstant(session.updatedAt);
    if (!occurredAt) continue;
    const sessionTimeZone = session.timezone ?? timeZone;
    const date = localDateFor(session.startedAt, sessionTimeZone, occurredAt.slice(0, 10));
    add({
      id: `focus:${session.id}`,
      date,
      occurredAt,
      label: `Fokusblock abgeschlossen: ${session.task}`,
      type: "focus",
      dedupeKey: session.taskId ? `task:${session.taskId}` : `focus:${session.id}`,
      priority: 50,
    });
  }

  for (const session of state.meditationSessions) {
    if (session.status !== "completed") continue;
    const occurredAt = validInstant(session.endedAt) ?? validInstant(session.updatedAt);
    if (!occurredAt) continue;
    const sessionTimeZone = session.timezone ?? timeZone;
    const date = localDateFor(session.startedAt, sessionTimeZone, occurredAt.slice(0, 10));
    const isRehearsal = session.focus === "Ausrichtung";
    add({
      id: `meditation:${session.id}`,
      date,
      occurredAt,
      label: isRehearsal ? "Mentale Probe durchgeführt" : "Meditation abgeschlossen",
      type: isRehearsal ? "rehearsal" : "meditation",
      dedupeKey: isRehearsal ? `rehearsal:${date}` : `meditation:${date}`,
      priority: 80,
    });
  }

  for (const instance of state.routineInstances) {
    for (const step of instance.steps) {
      if (!step.completed) continue;
      const occurredAt = validInstant(step.completedAt) ?? validInstant(instance.updatedAt);
      if (!occurredAt) continue;
      add({
        id: `routine:${step.id}`,
        date: instance.date,
        occurredAt,
        label: `Routine: ${step.title}`,
        type: "routine",
        dedupeKey: `routine:${step.id}`,
        priority: 70,
      });
    }
  }

  for (const date of new Set(identity.rehearsalDates)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < startedDate) continue;
    add({
      id: `rehearsal:${date}`,
      date,
      occurredAt: rehearsalInstant(date, timeZone, startedAt, startedDate),
      label: "Mentale Probe durchgeführt",
      type: "rehearsal",
      dedupeKey: `rehearsal:${date}`,
      priority: 70,
    });
  }

  return [...candidates.values()]
    .sort((left, right) =>
      right.occurredAt.localeCompare(left.occurredAt) || left.id.localeCompare(right.id),
    )
    .map(({ id, date, occurredAt, label, type }) => ({ id, date, occurredAt, label, type }));
}
