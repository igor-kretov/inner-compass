import {
  APP_SCHEMA_VERSION,
  newId,
  type DailyPlan,
  type DaySection,
  type PlannerBlock,
  type Task,
} from "./app-store";
import {
  MAX_DAILY_PLAN_BLOCKS,
  MAX_DAILY_PLAN_TASKS,
} from "@/domain/entities";

export { MAX_DAILY_PLAN_BLOCKS, MAX_DAILY_PLAN_TASKS } from "@/domain/entities";

export type { PlannerBlock } from "./app-store";

export const DEFAULT_PLAN_INTENTION =
  "Pay attention how often you have emotional responses that are not in alignment with life you want to create";

export const DEFAULT_PLAN_FOCUS_NOTE = "Was ist heute nützlich und sauber? (Fokus)";

export const SIMPLE_DAY_PLAN_TEMPLATE = [
  {
    title: "Morgen Block",
    note: "kein Handy bis fertig",
    section: "morning" as const,
    tasks: [
      "Morgen Routine (pinkeln, wiegen, Gesicht waschen, Zähne putzen, Wasser trinken)",
      "Eiweiss + Collagen + Creatine Getränk machen",
      "Laufen (siehe Wochenplan)",
      "Core Physio",
      "Meditieren",
      "Visualisieren (Desires, Goals and Intentions)",
      "Wochenplan anschauen",
    ],
  },
  {
    title: "Organisations Block",
    section: "day" as const,
    tasks: ["RAV-Dokumente", "Finanzen checken", "Mails checken"],
  },
  {
    title: "Business Block",
    section: "day" as const,
    tasks: ["Business (!)"],
  },
  {
    title: "Sport Block",
    section: "day" as const,
    tasks: ["Muay Thai oder Fitness", "Home"],
  },
  {
    title: "Bonus Block für Abend",
    section: "evening" as const,
    tasks: ["GTD Liste anschauen und Aufgaben bei Bedarf rausziehen"],
  },
  {
    title: "Abend Block",
    section: "evening" as const,
    tasks: [
      "Nagelheilung",
      "Abend Routine",
      "Nächsten Tag planen",
      "Gratitude",
      "Buch lesen",
    ],
  },
] as const;

const LEGACY_BLOCKS = {
  morning: {
    id: "00000000-0000-4000-8000-000000000101",
    title: "Morgen Block",
  },
  day: {
    id: "00000000-0000-4000-8000-000000000102",
    title: "Tages Block",
  },
  evening: {
    id: "00000000-0000-4000-8000-000000000103",
    title: "Abend Block",
  },
} as const satisfies Record<DaySection, PlannerBlock>;

const UNASSIGNED_BLOCK: PlannerBlock = {
  id: "00000000-0000-4000-8000-000000000104",
  title: "Weitere Aufgaben",
};

export function formatPlanDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : date;
}

export function formatPlanTitle(date: string): string {
  return `Plan für ${formatPlanDate(date)}`;
}

export function orderedPlanTasks(plan: DailyPlan): Task[] {
  return [plan.mainTask, ...plan.secondaryTasks];
}

function taskSectionForBlock(block: PlannerBlock): DaySection {
  const label = block.title.toLocaleLowerCase("de");
  if (label.includes("morgen")) return "morning";
  if (label.includes("abend")) return "evening";
  return "day";
}

function withOrderedTasks(plan: DailyPlan, tasks: Task[]): DailyPlan {
  if (tasks.length === 0) return plan;
  const mainTaskChanged = plan.mainTask.id !== tasks[0].id;
  return {
    ...plan,
    mainTask: tasks[0],
    secondaryTasks: tasks.slice(1),
    nextStep: mainTaskChanged ? "" : plan.nextStep,
  };
}

function sortTasksByBlocks(plan: DailyPlan): DailyPlan {
  const blocks = plan.plannerBlocks ?? [];
  const tasks = orderedPlanTasks(plan);
  const ordered = blocks.flatMap((block) =>
    tasks.filter((task) => task.plannerBlockId === block.id),
  );
  const visibleIds = new Set(ordered.map((task) => task.id));
  ordered.push(...tasks.filter((task) => !visibleIds.has(task.id)));
  return withOrderedTasks(plan, ordered);
}

/**
 * Materializes blocks for older plans. Existing tasks are never copied into
 * block records: mainTask and secondaryTasks remain the single source of truth.
 */
export function normalizeSimpleDayPlan(plan: DailyPlan): DailyPlan {
  const tasks = orderedPlanTasks(plan);
  if (!plan.plannerBlocks?.length) {
    const blocks = Object.values(LEGACY_BLOCKS).map((block) => ({ ...block }));
    const normalized = {
      ...plan,
      plannerBlocks: blocks,
      mainTask: {
        ...plan.mainTask,
        plannerBlockId: LEGACY_BLOCKS[plan.mainTask.section ?? "day"].id,
      },
      secondaryTasks: plan.secondaryTasks.map((task) => ({
        ...task,
        plannerBlockId: LEGACY_BLOCKS[task.section ?? "day"].id,
      })),
    };
    return sortTasksByBlocks(normalized);
  }

  const blockIds = new Set(plan.plannerBlocks.map((block) => block.id));
  const hasUnassignedTasks = tasks.some(
    (task) => !task.plannerBlockId || !blockIds.has(task.plannerBlockId),
  );
  if (!hasUnassignedTasks) return plan;

  const canAddUnassignedBlock = plan.plannerBlocks.length < MAX_DAILY_PLAN_BLOCKS;
  const fallbackBlock = blockIds.has(UNASSIGNED_BLOCK.id)
    ? plan.plannerBlocks.find((block) => block.id === UNASSIGNED_BLOCK.id)!
    : canAddUnassignedBlock
      ? UNASSIGNED_BLOCK
      : plan.plannerBlocks.at(-1)!;
  const plannerBlocks = blockIds.has(fallbackBlock.id)
    ? plan.plannerBlocks
    : [...plan.plannerBlocks, { ...fallbackBlock }];
  const normalized = {
    ...plan,
    plannerBlocks,
    mainTask: blockIds.has(plan.mainTask.plannerBlockId ?? "")
      ? plan.mainTask
      : { ...plan.mainTask, plannerBlockId: fallbackBlock.id },
    secondaryTasks: plan.secondaryTasks.map((task) =>
      blockIds.has(task.plannerBlockId ?? "")
        ? task
        : { ...task, plannerBlockId: fallbackBlock.id },
    ),
  };
  return sortTasksByBlocks(normalized);
}

export function plannerBlocksForPlan(plan: DailyPlan): PlannerBlock[] {
  return normalizeSimpleDayPlan(plan).plannerBlocks ?? [];
}

export function tasksForPlannerBlock(plan: DailyPlan, plannerBlockId: string): Task[] {
  const normalized = normalizeSimpleDayPlan(plan);
  return orderedPlanTasks(normalized).filter(
    (task) => task.plannerBlockId === plannerBlockId,
  );
}

export function movePlanTask(
  plan: DailyPlan,
  taskId: string,
  targetPlannerBlockId: string,
  targetIndex: number,
): DailyPlan {
  const normalized = normalizeSimpleDayPlan(plan);
  const blocks = normalized.plannerBlocks ?? [];
  if (!blocks.some((block) => block.id === targetPlannerBlockId)) return normalized;

  const source = orderedPlanTasks(normalized);
  const movingTask = source.find((task) => task.id === taskId);
  if (!movingTask) return normalized;

  const grouped = new Map(
    blocks.map((block) => [
      block.id,
      source.filter(
        (task) => task.id !== taskId && task.plannerBlockId === block.id,
      ),
    ]),
  );
  const target = grouped.get(targetPlannerBlockId) ?? [];
  const insertionIndex = Math.max(
    0,
    Math.min(Number.isFinite(targetIndex) ? Math.trunc(targetIndex) : target.length, target.length),
  );
  target.splice(insertionIndex, 0, {
    ...movingTask,
    plannerBlockId: targetPlannerBlockId,
    section: taskSectionForBlock(
      blocks.find((block) => block.id === targetPlannerBlockId)!,
    ),
  });
  grouped.set(targetPlannerBlockId, target);

  return withOrderedTasks(
    normalized,
    blocks.flatMap((block) => grouped.get(block.id) ?? []),
  );
}

export function addPlanTask(
  plan: DailyPlan,
  plannerBlockId: string,
  title: string,
): DailyPlan {
  const normalized = normalizeSimpleDayPlan(plan);
  const block = normalized.plannerBlocks?.find((item) => item.id === plannerBlockId);
  const cleanTitle = title.trim();
  if (
    !block ||
    !cleanTitle ||
    orderedPlanTasks(normalized).length >= MAX_DAILY_PLAN_TASKS
  ) {
    return normalized;
  }

  const task: Task = {
    id: newId(),
    title: cleanTitle.slice(0, 240),
    completed: false,
    status: "open",
    section: taskSectionForBlock(block),
    plannerBlockId,
  };
  const source = orderedPlanTasks(normalized);
  const grouped = new Map(
    (normalized.plannerBlocks ?? []).map((item) => [
      item.id,
      source.filter((candidate) => candidate.plannerBlockId === item.id),
    ]),
  );
  grouped.get(plannerBlockId)?.push(task);
  return withOrderedTasks(
    normalized,
    (normalized.plannerBlocks ?? []).flatMap((item) => grouped.get(item.id) ?? []),
  );
}

export function deletePlanTask(plan: DailyPlan, taskId: string): DailyPlan {
  const normalized = normalizeSimpleDayPlan(plan);
  const tasks = orderedPlanTasks(normalized);
  if (tasks.length <= 1 || !tasks.some((task) => task.id === taskId)) return normalized;
  return withOrderedTasks(
    normalized,
    tasks.filter((task) => task.id !== taskId),
  );
}

export function addPlannerBlock(
  plan: DailyPlan,
  title: string,
  note?: string,
): DailyPlan {
  const normalized = normalizeSimpleDayPlan(plan);
  const cleanTitle = title.trim();
  if (
    !cleanTitle ||
    (normalized.plannerBlocks?.length ?? 0) >= MAX_DAILY_PLAN_BLOCKS
  ) {
    return normalized;
  }
  const cleanNote = note?.trim();
  return {
    ...normalized,
    plannerBlocks: [
      ...(normalized.plannerBlocks ?? []),
      {
        id: newId(),
        title: cleanTitle.slice(0, 100),
        note: cleanNote ? cleanNote.slice(0, 240) : undefined,
      },
    ],
  };
}

export function movePlannerBlock(
  plan: DailyPlan,
  plannerBlockId: string,
  targetIndexOrId: number | string,
): DailyPlan {
  const normalized = normalizeSimpleDayPlan(plan);
  const blocks = [...(normalized.plannerBlocks ?? [])];
  const sourceIndex = blocks.findIndex((block) => block.id === plannerBlockId);
  if (sourceIndex < 0) return normalized;
  const requestedIndex = typeof targetIndexOrId === "string"
    ? blocks.findIndex((block) => block.id === targetIndexOrId)
    : targetIndexOrId;
  const [movingBlock] = blocks.splice(sourceIndex, 1);
  const insertionIndex = Math.max(
    0,
    Math.min(
      Number.isFinite(requestedIndex) && requestedIndex >= 0
        ? Math.trunc(requestedIndex)
        : blocks.length,
      blocks.length,
    ),
  );
  blocks.splice(insertionIndex, 0, movingBlock);
  return sortTasksByBlocks({ ...normalized, plannerBlocks: blocks });
}

export function deletePlannerBlock(plan: DailyPlan, plannerBlockId: string): DailyPlan {
  const normalized = normalizeSimpleDayPlan(plan);
  const blocks = normalized.plannerBlocks ?? [];
  const sourceIndex = blocks.findIndex((block) => block.id === plannerBlockId);
  if (sourceIndex < 0 || blocks.length <= 1) return normalized;

  const remainingBlocks = blocks.filter((block) => block.id !== plannerBlockId);
  const destination = remainingBlocks[Math.min(sourceIndex, remainingBlocks.length - 1)];
  const tasks = orderedPlanTasks(normalized).map((task) =>
    task.plannerBlockId === plannerBlockId
      ? {
          ...task,
          plannerBlockId: destination.id,
          section: taskSectionForBlock(destination),
        }
      : task,
  );
  return sortTasksByBlocks(
    withOrderedTasks({ ...normalized, plannerBlocks: remainingBlocks }, tasks),
  );
}

export function createSimpleDayPlan(date: string, timeZone?: string): DailyPlan {
  const timestamp = new Date().toISOString();
  const timezone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const plannerBlocks = SIMPLE_DAY_PLAN_TEMPLATE.map((block) => ({
    id: newId(),
    title: block.title,
    ...("note" in block && block.note ? { note: block.note } : {}),
  }));
  const tasks = SIMPLE_DAY_PLAN_TEMPLATE.flatMap((block, blockIndex) =>
    block.tasks.map<Task>((title) => ({
      id: newId(),
      title,
      completed: false,
      status: "open",
      section: block.section,
      plannerBlockId: plannerBlocks[blockIndex].id,
    })),
  );

  return {
    id: newId(),
    date,
    intention: DEFAULT_PLAN_INTENTION,
    focusNote: DEFAULT_PLAN_FOCUS_NOTE,
    plannerBlocks,
    mainTask: tasks[0],
    nextStep: "",
    secondaryTasks: tasks.slice(1),
    bodyCompleted: false,
    meditationSkipped: false,
    meditationCompleted: false,
    courageousCompleted: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion: APP_SCHEMA_VERSION,
    timezone,
  };
}
