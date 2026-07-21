import type {
  DailyPlan,
  DailyTask,
  MeditationSession,
  PatternEntry,
} from "../entities";

export const PATTERN_MINIMUM_ENTRIES = 5;
export const PATTERN_ESTABLISHED_ENTRIES = 10;
export const PATTERN_DISCLAIMER = "Das ist eine Beobachtung, kein Beweis für eine Ursache.";

export interface PatternEvidence {
  sampleSize: number;
  matchingCount: number;
  ratio: number;
  comparisonRatio?: number;
}

export interface PatternInsight {
  id: string;
  confidence: "early" | "established";
  message: string;
  disclaimer: typeof PATTERN_DISCLAIMER;
  evidence: PatternEvidence;
}

export interface PatternAnalysis {
  status: "insufficient-data" | "observations";
  relevantEntries: number;
  message: string;
  insights: PatternInsight[];
}

export interface PatternInputs {
  entries: readonly PatternEntry[];
  dailyPlans?: readonly DailyPlan[];
  dailyTasks?: readonly DailyTask[];
  meditationSessions?: readonly MeditationSession[];
}

const BODY_LABELS: Record<PatternEntry["bodyState"], string> = {
  tense: "Anspannung",
  restless: "Unruhe",
  exhausted: "Erschöpfung",
  activated: "Aktivierung",
  calm: "Ruhe",
  heavy: "Schwere",
  neutral: "ein neutraler Körperzustand",
};

function confidence(sampleSize: number): PatternInsight["confidence"] {
  return sampleSize >= PATTERN_ESTABLISHED_ENTRIES ? "established" : "early";
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function prefixFor(sampleSize: number): string {
  return sampleSize < PATTERN_ESTABLISHED_ENTRIES ? "Vorsichtiger Hinweis: " : "";
}

function movementInsight(entries: readonly PatternEntry[]): PatternInsight | null {
  const movementEntries = entries.filter(
    (entry) => entry.chosenAction === "trained" || entry.chosenAction === "walked",
  );
  if (movementEntries.length < PATTERN_MINIMUM_ENTRIES) return null;
  const improved = movementEntries.filter(
    (entry) => entry.stateAfter === "somewhat-better" || entry.stateAfter === "much-better",
  ).length;
  const improvementRatio = ratio(improved, movementEntries.length);
  if (improvementRatio < 0.5) return null;
  return {
    id: "movement-and-improvement",
    confidence: confidence(movementEntries.length),
    message: `${prefixFor(movementEntries.length)}Nach Bewegung wurde dein Zustand in ${improved} von ${movementEntries.length} Einträgen als besser festgehalten.`,
    disclaimer: PATTERN_DISCLAIMER,
    evidence: {
      sampleSize: movementEntries.length,
      matchingCount: improved,
      ratio: improvementRatio,
    },
  };
}

function bodyStateInsight(entries: readonly PatternEntry[]): PatternInsight | null {
  const counts = new Map<PatternEntry["bodyState"], number>();
  for (const entry of entries) counts.set(entry.bodyState, (counts.get(entry.bodyState) ?? 0) + 1);
  const top = [...counts.entries()].sort((left, right) => right[1] - left[1])[0];
  if (!top || top[1] < 3 || ratio(top[1], entries.length) < 0.4) return null;
  return {
    id: `body-state-${top[0]}`,
    confidence: confidence(entries.length),
    message: `${prefixFor(entries.length)}In deinen Einträgen trat ${BODY_LABELS[top[0]]} ${top[1]}-mal gemeinsam mit einer Gedankenschleife auf.`,
    disclaimer: PATTERN_DISCLAIMER,
    evidence: {
      sampleSize: entries.length,
      matchingCount: top[1],
      ratio: ratio(top[1], entries.length),
    },
  };
}

function meditationAndStartingInsight(inputs: PatternInputs): PatternInsight | null {
  const plans = inputs.dailyPlans ?? [];
  const tasks = inputs.dailyTasks ?? [];
  const meditationDays = new Set(
    (inputs.meditationSessions ?? [])
      .filter((session) => session.status === "completed")
      .map((session) => session.localDate),
  );
  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  const primaryTasks = tasks.filter((task) => task.role === "primary");
  const meditating = primaryTasks.filter((task) => {
    const plan = planById.get(task.dailyPlanId);
    return plan ? meditationDays.has(plan.localDate) : false;
  });
  const notMeditating = primaryTasks.filter((task) => {
    const plan = planById.get(task.dailyPlanId);
    return plan ? !meditationDays.has(plan.localDate) : false;
  });
  if (
    meditating.length < PATTERN_MINIMUM_ENTRIES ||
    notMeditating.length < PATTERN_MINIMUM_ENTRIES
  ) {
    return null;
  }
  const meditatingStarted = meditating.filter((task) => task.startedAt !== null).length;
  const otherStarted = notMeditating.filter((task) => task.startedAt !== null).length;
  const withRate = ratio(meditatingStarted, meditating.length);
  const withoutRate = ratio(otherStarted, notMeditating.length);
  if (withRate - withoutRate < 0.2) return null;
  const sampleSize = meditating.length + notMeditating.length;
  return {
    id: "meditation-and-primary-task-start",
    confidence: confidence(sampleSize),
    message: `${prefixFor(sampleSize)}An Tagen mit Meditation hast du deine Hauptaufgabe häufiger begonnen (${meditatingStarted} von ${meditating.length} gegenüber ${otherStarted} von ${notMeditating.length}).`,
    disclaimer: PATTERN_DISCLAIMER,
    evidence: {
      sampleSize,
      matchingCount: meditatingStarted,
      ratio: withRate,
      comparisonRatio: withoutRate,
    },
  };
}

export function calculatePatternInsights(inputs: PatternInputs): PatternAnalysis {
  if (inputs.entries.length < PATTERN_MINIMUM_ENTRIES) {
    return {
      status: "insufficient-data",
      relevantEntries: inputs.entries.length,
      message: "Bei weniger als fünf Einträgen reichen die Daten noch nicht für ein Muster.",
      insights: [],
    };
  }

  const insights = [
    movementInsight(inputs.entries),
    bodyStateInsight(inputs.entries),
    meditationAndStartingInsight(inputs),
  ].filter((item): item is PatternInsight => item !== null);

  return {
    status: "observations",
    relevantEntries: inputs.entries.length,
    message:
      insights.length > 0
        ? "Einfache Beobachtungen aus deinen lokalen Einträgen."
        : "Noch zeigt sich kein ausreichend deutliches gemeinsames Muster.",
    insights,
  };
}
