"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type ScreenReaderInstructions,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/class-names";
import {
  localDateKey,
  shiftLocalDate,
  useAppStore,
  type DailyPlan,
  type PlannerBlock,
  type Task,
} from "@/lib/app-store";
import {
  DEFAULT_PLAN_FOCUS_NOTE,
  DEFAULT_PLAN_INTENTION,
  addPlannerBlock,
  addPlanTask as addTaskToPlan,
  createSimpleDayPlan,
  deletePlannerBlock,
  deletePlanTask,
  formatPlanDate,
  movePlannerBlock,
  movePlanTask,
  normalizeSimpleDayPlan,
  plannerBlocksForPlan,
  tasksForPlannerBlock,
} from "@/lib/simple-day-plan";

type DragData =
  | { kind: "block"; blockId: string; label: string; taskCount: number }
  | { kind: "task"; blockId: string; taskId: string; label: string };

const blockDragId = (id: string) => `block:${id}`;
const taskDragId = (id: string) => `task:${id}`;

const PLANNER_SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    "Zum Aufnehmen die Leertaste drücken. Mit Pfeil nach oben oder unten wird der Eintrag jeweils genau um eine Position verschoben. Am Ende eines Blocks wechselt eine Aufgabe in den benachbarten Block. Zum Ablegen erneut die Leertaste drücken oder mit Escape abbrechen.",
};

function dragDataFromValue(value: unknown): DragData | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<DragData>;
  if (candidate.kind === "task" && candidate.blockId && candidate.taskId && candidate.label) {
    return candidate as Extract<DragData, { kind: "task" }>;
  }
  if (
    candidate.kind === "block"
    && candidate.blockId
    && candidate.label
    && typeof candidate.taskCount === "number"
  ) {
    return candidate as Extract<DragData, { kind: "block" }>;
  }
  return undefined;
}

function isEligibleDropTarget(active: DragData, target: DragData | undefined) {
  if (!target) return false;
  if (active.kind === "block") return target.kind === "block";
  return target.kind === "task" || (target.kind === "block" && target.taskCount === 0);
}

export interface PlannerKeyboardTargetRef {
  current: UniqueIdentifier | null;
}

/** Keep nested block and task sortables from competing for the same collision. */
export function createPlannerCollisionDetection(
  keyboardTarget?: PlannerKeyboardTargetRef,
): CollisionDetection {
  return (args) => {
    const active = dragDataFromValue(args.active.data.current);
    if (!active) return closestCenter(args);

    const eligibleContainers = args.droppableContainers.filter((container) =>
      isEligibleDropTarget(active, dragDataFromValue(container.data.current)),
    );
    const lockedKeyboardTarget = keyboardTarget?.current == null
      ? undefined
      : eligibleContainers.find((container) => container.id === keyboardTarget.current);

    // Sortable rows transform as soon as a keyboard drag starts. Locking the
    // intended neighbour keeps that visual shift from changing a one-step move
    // into a jump over multiple rows. Pointer/touch drags never set this ref.
    if (lockedKeyboardTarget && args.droppableRects.has(lockedKeyboardTarget.id)) {
      return [{
        id: lockedKeyboardTarget.id,
        data: { droppableContainer: lockedKeyboardTarget, value: 0 },
      }];
    }

    return closestCenter({
      ...args,
      droppableContainers: eligibleContainers,
    });
  };
}

export const plannerCollisionDetection = createPlannerCollisionDetection();

/**
 * dnd-kit's default sortable getter searches every nested SortableContext, which
 * can skip several task rows. This getter selects the immediate visual neighbour.
 */
export function createPlannerKeyboardCoordinates(
  keyboardTarget?: PlannerKeyboardTargetRef,
): KeyboardCoordinateGetter {
  return (event, { active: activeId, context }) => {
    if (event.code !== KeyboardCode.Up && event.code !== KeyboardCode.Down) return undefined;
    event.preventDefault();

    const active = dragDataFromValue(context.active?.data.current);
    if (!active || !context.collisionRect) return undefined;

    const candidates = context.droppableContainers
      .getEnabled()
      .filter((container) =>
        isEligibleDropTarget(active, dragDataFromValue(container.data.current)),
      )
      .map((container) => ({
        id: container.id,
        rect: context.droppableRects.get(container.id),
      }))
      .filter((candidate): candidate is { id: typeof candidate.id; rect: NonNullable<typeof candidate.rect> } =>
        Boolean(candidate.rect),
      )
      .sort((first, second) =>
        first.rect.top - second.rect.top || first.rect.left - second.rect.left,
      );

    // `over` can already point at the next row immediately after keyboard lift
    // because sortable siblings transform around the active item. The logical
    // position is therefore only the active item, followed by targets chosen by
    // earlier arrow keys in this same drag.
    const currentId = keyboardTarget?.current ?? activeId;
    const currentIndex = candidates.findIndex((candidate) => candidate.id === currentId);
    if (currentIndex < 0) return undefined;

    const step = event.code === KeyboardCode.Down ? 1 : -1;
    const target = candidates[currentIndex + step];
    if (!target) return undefined;
    if (keyboardTarget) keyboardTarget.current = target.id;

    return {
      x: target.rect.left + (target.rect.width - context.collisionRect.width) / 2,
      y: target.rect.top + (target.rect.height - context.collisionRect.height) / 2,
    };
  };
}

export const plannerKeyboardCoordinates = createPlannerKeyboardCoordinates();

export function createPlannerKeyboardDnd() {
  const target: PlannerKeyboardTargetRef = { current: null };
  return {
    collisionDetection: createPlannerCollisionDetection(target),
    coordinateGetter: createPlannerKeyboardCoordinates(target),
    reset() {
      target.current = null;
    },
  };
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={direction === "right" ? "rotate-180" : undefined}
    >
      <path d="m14.5 6.5-5.5 5.5 5.5 5.5" />
    </svg>
  );
}

function GripIcon() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="currentColor" aria-hidden="true">
      <circle cx="6" cy="5" r="1.35" />
      <circle cx="14" cy="5" r="1.35" />
      <circle cx="6" cy="10" r="1.35" />
      <circle cx="14" cy="10" r="1.35" />
      <circle cx="6" cy="15" r="1.35" />
      <circle cx="14" cy="15" r="1.35" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5.5 5.5 14.5 14.5M14.5 5.5l-9 9" />
    </svg>
  );
}

function EditText({
  value,
  label,
  maxLength,
  multiline = false,
  className,
  onCommit,
}: {
  value: string;
  label: string;
  maxLength: number;
  multiline?: boolean;
  className?: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);

  const commit = () => {
    if (cancelled.current) {
      cancelled.current = false;
      setDraft(value);
      return;
    }
    const normalized = draft.trim();
    if (normalized && normalized !== value) onCommit(normalized);
    if (!normalized) setDraft(value);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      cancelled.current = true;
      event.currentTarget.blur();
    }
    if (!multiline && event.key === "Enter") event.currentTarget.blur();
  };

  if (multiline) {
    return (
      <textarea
        className={cn("control min-h-20 resize-y py-3", className)}
        aria-label={label}
        value={draft}
        maxLength={maxLength}
        rows={2}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
      />
    );
  }

  return (
    <input
      className={cn("control min-h-10 px-3 py-2", className)}
      aria-label={label}
      value={draft}
      maxLength={maxLength}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={commit}
    />
  );
}

function SortableTaskRow({
  task,
  block,
  position,
  taskCount,
  canDelete,
  editing,
  onToggle,
  onRename,
  onDelete,
}: {
  task: Task;
  block: PlannerBlock;
  position: number;
  taskCount: number;
  canDelete: boolean;
  editing: boolean;
  onToggle: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const dragId = taskDragId(task.id);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: dragId,
    data: {
      kind: "task",
      blockId: block.id,
      taskId: task.id,
      label: task.title,
    } satisfies DragData,
  });
  const checked = task.completed || task.status === "completed";

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("simple-task-row", isDragging && "simple-dragging")}
    >
      <label className="simple-checkbox-wrap">
        <input
          type="checkbox"
          className="simple-checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={checked ? `„${task.title}“ wieder öffnen` : `„${task.title}“ abhaken`}
        />
      </label>

      <div className="min-w-0 flex-1">
        {editing ? (
          <EditText
            value={task.title}
            label={`Aufgabe „${task.title}“ bearbeiten`}
            maxLength={180}
            className="w-full"
            onCommit={onRename}
          />
        ) : (
          <span className={cn("simple-task-title", checked && "simple-task-completed")}>{task.title}</span>
        )}
      </div>

      {editing && canDelete ? (
        <button
          type="button"
          className="simple-icon-button text-danger"
          aria-label={`Aufgabe „${task.title}“ löschen`}
          onClick={onDelete}
        >
          <RemoveIcon />
        </button>
      ) : null}

      <button
        type="button"
        className="simple-drag-handle"
        aria-label={`„${task.title}“ verschieben, Position ${position} von ${taskCount} in ${block.title}`}
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
    </li>
  );
}

function AddTaskForm({
  block,
  onAdd,
}: {
  block: PlannerBlock;
  onAdd: (title: string) => void;
}) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = title.trim();
    if (!normalized) return;
    onAdd(normalized);
    setTitle("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        className="simple-add-button"
        onClick={() => setOpen(true)}
        aria-label={`Aufgabe zu ${block.title} hinzufügen`}
      >
        <span aria-hidden="true">+</span> Aufgabe
      </button>
    );
  }

  return (
    <form className="simple-inline-form" onSubmit={submit}>
      <label className="sr-only" htmlFor={inputId}>Neue Aufgabe in {block.title}</label>
      <input
        id={inputId}
        className="control min-h-11 min-w-0 flex-1 px-3 py-2"
        value={title}
        maxLength={180}
        autoFocus
        placeholder="Neue Aufgabe"
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setTitle("");
          }
        }}
      />
      <Button type="submit" size="sm" disabled={!title.trim()}>Hinzufügen</Button>
      <button
        type="button"
        className="simple-icon-button"
        aria-label="Hinzufügen abbrechen"
        onClick={() => {
          setOpen(false);
          setTitle("");
        }}
      >
        <RemoveIcon />
      </button>
    </form>
  );
}

function SortablePlannerBlock({
  block,
  position,
  blockCount,
  plan,
  editing,
  canDeleteBlock,
  canDeleteTask,
  onRenameBlock,
  onDeleteBlock,
  onToggleTask,
  onRenameTask,
  onDeleteTask,
  onAddTask,
}: {
  block: PlannerBlock;
  position: number;
  blockCount: number;
  plan: DailyPlan;
  editing: boolean;
  canDeleteBlock: boolean;
  canDeleteTask: boolean;
  onRenameBlock: (title: string) => void;
  onDeleteBlock: () => void;
  onToggleTask: (task: Task) => void;
  onRenameTask: (task: Task, title: string) => void;
  onDeleteTask: (task: Task) => void;
  onAddTask: (title: string) => void;
}) {
  const tasks = tasksForPlannerBlock(plan, block.id);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: blockDragId(block.id),
    data: {
      kind: "block",
      blockId: block.id,
      label: block.title,
      taskCount: tasks.length,
    } satisfies DragData,
  });

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("simple-plan-block", isDragging && "simple-dragging")}
      aria-labelledby={editing ? undefined : `planner-block-${block.id}`}
      aria-label={editing ? block.title : undefined}
    >
      <header className="simple-block-header">
        <div className="min-w-0 flex-1">
          {editing ? (
            <EditText
              value={block.title}
              label={`Block „${block.title}“ bearbeiten`}
              maxLength={80}
              className="font-semibold"
              onCommit={onRenameBlock}
            />
          ) : (
            <h2 id={`planner-block-${block.id}`}>{block.title}</h2>
          )}
          {block.note ? <p>{block.note}</p> : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {editing && canDeleteBlock ? (
            <button
              type="button"
              className="simple-icon-button text-danger"
              aria-label={`Block „${block.title}“ löschen`}
              onClick={onDeleteBlock}
            >
              <RemoveIcon />
            </button>
          ) : null}
          {editing ? (
            <button
              type="button"
              className="simple-drag-handle"
              aria-label={`Block „${block.title}“ verschieben, Position ${position} von ${blockCount}`}
              {...attributes}
              {...listeners}
            >
              <GripIcon />
            </button>
          ) : null}
        </div>
      </header>

      <SortableContext
        items={tasks.map((task) => taskDragId(task.id))}
        strategy={verticalListSortingStrategy}
      >
        <ul className="simple-task-list">
          {tasks.map((task, taskIndex) => (
            <SortableTaskRow
              key={task.id}
              task={task}
              block={block}
              position={taskIndex + 1}
              taskCount={tasks.length}
              canDelete={canDeleteTask}
              editing={editing}
              onToggle={() => onToggleTask(task)}
              onRename={(title) => onRenameTask(task, title)}
              onDelete={() => onDeleteTask(task)}
            />
          ))}
        </ul>
      </SortableContext>

      <AddTaskForm block={block} onAdd={onAddTask} />
    </section>
  );
}

function AddBlockForm({ onAdd }: { onAdd: (title: string) => void }) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = title.trim();
    if (!normalized) return;
    onAdd(normalized);
    setTitle("");
    setOpen(false);
  };

  if (!open) {
    return (
      <Button variant="ghost" className="justify-self-start" onClick={() => setOpen(true)}>
        <span aria-hidden="true">+</span> Block
      </Button>
    );
  }

  return (
    <form className="simple-new-block" onSubmit={submit}>
      <label htmlFor={inputId} className="text-sm font-semibold">Name des neuen Blocks</label>
      <div className="simple-inline-form">
        <input
          id={inputId}
          className="control min-h-11 min-w-0 flex-1 px-3 py-2"
          value={title}
          maxLength={80}
          autoFocus
          placeholder="Zum Beispiel Lernblock"
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setTitle("");
            }
          }}
        />
        <Button type="submit" size="sm" disabled={!title.trim()}>Block hinzufügen</Button>
        <button
          type="button"
          className="simple-icon-button"
          aria-label="Neuen Block abbrechen"
          onClick={() => {
            setOpen(false);
            setTitle("");
          }}
        >
          <RemoveIcon />
        </button>
      </div>
    </form>
  );
}

function Alignment({
  plan,
  editing,
  onUpdate,
}: {
  plan: DailyPlan;
  editing: boolean;
  onUpdate: (patch: Pick<DailyPlan, "intention" | "focusNote">) => void;
}) {
  if (editing) {
    return (
      <Card padding="sm" variant="muted" className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-semibold">
          Ausrichtung
          <EditText
            value={plan.intention ?? DEFAULT_PLAN_INTENTION}
            label="Ausrichtung bearbeiten"
            maxLength={400}
            multiline
            onCommit={(intention) => onUpdate({
              intention,
              focusNote: plan.focusNote ?? DEFAULT_PLAN_FOCUS_NOTE,
            })}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          Fokus
          <EditText
            value={plan.focusNote ?? DEFAULT_PLAN_FOCUS_NOTE}
            label="Fokus bearbeiten"
            maxLength={240}
            multiline
            onCommit={(focusNote) => onUpdate({
              intention: plan.intention ?? DEFAULT_PLAN_INTENTION,
              focusNote,
            })}
          />
        </label>
      </Card>
    );
  }

  return (
    <aside className="simple-alignment" aria-label="Ausrichtung für den Tag">
      <p>{plan.intention ?? DEFAULT_PLAN_INTENTION}</p>
      <p>{plan.focusNote ?? DEFAULT_PLAN_FOCUS_NOTE}</p>
    </aside>
  );
}

function dragDataFrom(event: DragStartEvent | DragEndEvent): DragData | undefined {
  return dragDataFromValue(event.active.data.current);
}

export function SimpleDayPlanner({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const {
    state,
    savePlan,
    updatePlanForDate,
    setTaskStatus,
  } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [activeDrag, setActiveDrag] = useState<DragData>();
  const today = localDateKey();
  const tomorrow = shiftLocalDate(today, 1);
  const storedPlan = state.plans.find((candidate) => candidate.date === selectedDate);
  const plan = useMemo(
    () => storedPlan ? normalizeSimpleDayPlan(storedPlan) : undefined,
    [storedPlan],
  );
  const blocks = useMemo(
    () => plan ? plannerBlocksForPlan(plan) : [],
    [plan],
  );
  const [keyboardDnd] = useState(createPlannerKeyboardDnd);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 7 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardDnd.coordinateGetter }),
  );
  const allTasks = useMemo(
    () => plan ? blocks.flatMap((block) => tasksForPlannerBlock(plan, block.id)) : [],
    [blocks, plan],
  );
  const completedCount = allTasks.filter((task) => task.completed || task.status === "completed").length;
  const blockTitleById = useMemo(
    () => new Map(blocks.map((block) => [block.id, block.title])),
    [blocks],
  );

  const announcements = useMemo<Announcements>(() => {
    const describeDropPosition = (active: DragData, overValue: unknown) => {
      const over = dragDataFromValue(overValue);
      if (!over || !plan) return "außerhalb der Liste";

      if (active.kind === "block") {
        const position = blocks.findIndex((block) => block.id === over.blockId) + 1;
        return position > 0 ? `Position ${position} von ${blocks.length}` : "in der Blockliste";
      }

      const blockTitle = blockTitleById.get(over.blockId) ?? "diesem Block";
      if (over.kind === "block") return `Position 1 in ${blockTitle}`;
      const tasks = tasksForPlannerBlock(plan, over.blockId);
      const position = tasks.findIndex((task) => task.id === over.taskId) + 1;
      return position > 0
        ? `Position ${position} von ${tasks.length} in ${blockTitle}`
        : `in ${blockTitle}`;
    };

    return {
      onDragStart({ active }) {
        const item = dragDataFromValue(active.data.current);
        if (!item) return "Eintrag aufgenommen.";
        return item.kind === "task"
          ? `Aufgabe „${item.label}“ aufgenommen. Pfeil nach oben oder unten verschiebt sie um eine Position.`
          : `Block „${item.label}“ aufgenommen. Pfeil nach oben oder unten verschiebt ihn um eine Position.`;
      },
      onDragOver({ active, over }) {
        const item = dragDataFromValue(active.data.current);
        if (!item || !over) return undefined;
        const noun = item.kind === "task" ? "Aufgabe" : "Block";
        return `${noun} „${item.label}“: ${describeDropPosition(item, over.data.current)}.`;
      },
      onDragEnd({ active, over }) {
        const item = dragDataFromValue(active.data.current);
        if (!item) return "Eintrag abgelegt.";
        const noun = item.kind === "task" ? "Aufgabe" : "Block";
        return over
          ? `${noun} „${item.label}“ abgelegt: ${describeDropPosition(item, over.data.current)}.`
          : `${noun} „${item.label}“ unverändert abgelegt.`;
      },
      onDragCancel({ active }) {
        const item = dragDataFromValue(active.data.current);
        if (!item) return "Verschieben abgebrochen.";
        return `Verschieben von „${item.label}“ abgebrochen.`;
      },
    };
  }, [blockTitleById, blocks, plan]);

  const updatePlan = (updater: (current: DailyPlan) => DailyPlan) => {
    updatePlanForDate(selectedDate, (current) => updater(normalizeSimpleDayPlan(current)));
  };
  const prepareDay = () => {
    savePlan(createSimpleDayPlan(selectedDate, state.settings.timezone));
  };
  const renameTask = (task: Task, title: string) => {
    updatePlan((current) => ({
      ...current,
      mainTask: current.mainTask.id === task.id ? { ...current.mainTask, title } : current.mainTask,
      secondaryTasks: current.secondaryTasks.map((candidate) =>
        candidate.id === task.id ? { ...candidate, title } : candidate,
      ),
    }));
  };
  const renameBlock = (block: PlannerBlock, title: string) => {
    updatePlan((current) => ({
      ...current,
      plannerBlocks: (current.plannerBlocks ?? []).map((candidate) =>
        candidate.id === block.id ? { ...candidate, title } : candidate,
      ),
    }));
  };

  const handleDragStart = (event: DragStartEvent) => {
    keyboardDnd.reset();
    setActiveDrag(dragDataFrom(event));
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const active = dragDataFrom(event);
    const over = dragDataFromValue(event.over?.data.current);
    keyboardDnd.reset();
    setActiveDrag(undefined);
    if (!active || !over) return;

    if (active.kind === "block") {
      const targetBlockId = over.blockId;
      if (targetBlockId !== active.blockId) {
        const targetIndex = blocks.findIndex((block) => block.id === targetBlockId);
        updatePlan((current) => movePlannerBlock(current, active.blockId, targetIndex));
      }
      return;
    }

    const targetBlockId = over.blockId;
    const targetTasks = plan ? tasksForPlannerBlock(plan, targetBlockId) : [];
    const targetIndex = over.kind === "task"
      ? Math.max(0, targetTasks.findIndex((task) => task.id === over.taskId))
      : targetTasks.length;
    updatePlan((current) => movePlanTask(current, active.taskId, targetBlockId, targetIndex));
  };

  const dateNavigation: ReactNode = (
    <nav className="simple-date-navigation" aria-label="Tagesplan auswählen">
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="simple-date-arrow"
          aria-label="Vorheriger Tag"
          onClick={() => onSelectDate(shiftLocalDate(selectedDate, -1))}
        >
          <ArrowIcon direction="left" />
        </button>
        <button
          type="button"
          className="simple-date-arrow"
          aria-label="Nächster Tag"
          onClick={() => onSelectDate(shiftLocalDate(selectedDate, 1))}
        >
          <ArrowIcon direction="right" />
        </button>
      </div>
      <div className="simple-date-shortcuts">
        <button
          type="button"
          aria-pressed={selectedDate === today}
          onClick={() => onSelectDate(today)}
        >
          Heute
        </button>
        <button
          type="button"
          aria-pressed={selectedDate === tomorrow}
          onClick={() => onSelectDate(tomorrow)}
        >
          Morgen
        </button>
      </div>
    </nav>
  );

  return (
    <div className="simple-day-page">
      {dateNavigation}

      <header className="simple-day-heading">
        <div className="min-w-0">
          <p className="eyebrow">Tagesplanung</p>
          <h1>Plan für {formatPlanDate(selectedDate)}</h1>
          {plan && allTasks.length > 0 ? (
            <p>{completedCount} von {allTasks.length} erledigt</p>
          ) : null}
        </div>
        {plan && blocks.length > 0 ? (
          <Button
            variant={editing ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setEditing((value) => !value)}
            aria-pressed={editing}
          >
            {editing ? "Fertig" : "Bearbeiten"}
          </Button>
        ) : null}
      </header>

      {!plan || blocks.length === 0 ? (
        <Card className="simple-empty-day" variant="muted">
          <p>Ein klarer Plan, ohne jedes Feld einzeln aufzubauen.</p>
          <Button onClick={prepareDay}>Tag aus Vorlage vorbereiten</Button>
        </Card>
      ) : (
        <>
          <Alignment
            plan={plan}
            editing={editing}
            onUpdate={(patch) => updatePlan((current) => ({ ...current, ...patch }))}
          />

          <DndContext
            sensors={sensors}
            collisionDetection={keyboardDnd.collisionDetection}
            accessibility={{
              announcements,
              screenReaderInstructions: PLANNER_SCREEN_READER_INSTRUCTIONS,
            }}
            onDragStart={handleDragStart}
            onDragCancel={() => {
              keyboardDnd.reset();
              setActiveDrag(undefined);
            }}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map((block) => blockDragId(block.id))}
              strategy={verticalListSortingStrategy}
            >
              <div className="simple-block-list">
                {blocks.map((block, blockIndex) => (
                  <SortablePlannerBlock
                    key={block.id}
                    block={block}
                    position={blockIndex + 1}
                    blockCount={blocks.length}
                    plan={plan}
                    editing={editing}
                    canDeleteBlock={blocks.length > 1}
                    canDeleteTask={allTasks.length > 1}
                    onRenameBlock={(title) => renameBlock(block, title)}
                    onDeleteBlock={() => updatePlan((current) => deletePlannerBlock(current, block.id))}
                    onToggleTask={(task) => setTaskStatus(
                      selectedDate,
                      task.id,
                      task.completed || task.status === "completed" ? "open" : "completed",
                    )}
                    onRenameTask={renameTask}
                    onDeleteTask={(task) => updatePlan((current) => deletePlanTask(current, task.id))}
                    onAddTask={(title) => updatePlan((current) => addTaskToPlan(current, block.id, title))}
                  />
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeDrag ? (
                <div className="simple-drag-overlay">
                  <GripIcon />
                  <span>{activeDrag.label}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          <AddBlockForm
            onAdd={(title) => updatePlan((current) => addPlannerBlock(current, title))}
          />
        </>
      )}
    </div>
  );
}
