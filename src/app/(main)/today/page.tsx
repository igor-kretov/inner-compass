"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { RoutinePlanner } from "@/components/planner/routine-planner";
import { WeekPlanner } from "@/components/planner/week-planner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field, TextArea, TextInput } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import {
  localDateKey,
  newId,
  resolvedTaskStatus,
  shiftLocalDate,
  useAppStore,
  weekStartKey,
  type DailyPlan,
  type DaySection,
  type Energy,
  type MentalState,
  type PlannerItemStatus,
  type RoutineInstance,
  type Task,
} from "@/lib/app-store";

const dayPhrases = [
  "Was zählt heute wirklich?",
  "Ein klarer Tag beginnt mit einer klaren Entscheidung.",
  "Nicht alles. Das Wesentliche.",
  "Klarheit entsteht oft beim Handeln.",
];

const sectionLabels: Record<DaySection, { eyebrow: string; title: string; empty: string }> = {
  morning: {
    eyebrow: "Ankommen",
    title: "Morgen",
    empty: "Kein fester Ablauf. Der Morgen darf offen bleiben.",
  },
  day: {
    eyebrow: "Handeln",
    title: "Tag",
    empty: "Neben der Hauptaufgabe ist hier noch nichts eingeplant.",
  },
  evening: {
    eyebrow: "Zurückkehren",
    title: "Abend",
    empty: "Noch kein bewusster Abschluss eingeplant.",
  },
};

function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 11) return "Guten Morgen";
  if (hour < 17) return "Guten Tag";
  return "Guten Abend";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat("de-CH", {
    weekday: "short",
    day: "numeric",
    month: "2-digit",
  }).format(new Date(`${dateKey}T12:00:00`));
}

function sectionForTime(time: string | undefined, fallback: DaySection): DaySection {
  if (!time) return fallback;
  const hour = Number(time.slice(0, 2));
  if (hour < 11) return "morning";
  if (hour >= 17) return "evening";
  return "day";
}

type PlanDraft = {
  mainTask: string;
  nextStep: string;
  secondaryOne: string;
  secondaryTwo: string;
  bodyActivity: string;
  meditation: string;
  courageousAction: string;
  startTime: string;
  energy?: Energy;
  mentalState?: MentalState;
};

function draftFrom(plan?: DailyPlan, suggestedMain = ""): PlanDraft {
  return {
    mainTask: plan?.mainTask.title ?? suggestedMain,
    nextStep: plan?.nextStep ?? "",
    secondaryOne: plan?.secondaryTasks[0]?.title ?? "",
    secondaryTwo: plan?.secondaryTasks[1]?.title ?? "",
    bodyActivity: plan?.bodyActivity ?? "",
    meditation: plan?.meditationSkipped
      ? "skip"
      : plan?.meditationMinutes
        ? String(plan.meditationMinutes)
        : "10",
    courageousAction: plan?.courageousAction ?? "",
    startTime: plan?.startTime ?? plan?.mainTask.plannedTime ?? "",
    energy: plan?.energy,
    mentalState: plan?.mentalState,
  };
}

function DailyPlanForm({
  date,
  plan,
  suggestedMain,
  onDone,
}: {
  date: string;
  plan?: DailyPlan;
  suggestedMain?: string;
  onDone: () => void;
}) {
  const { savePlan } = useAppStore();
  const [draft, setDraft] = useState(() => draftFrom(plan, suggestedMain));
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.mainTask.trim()) {
      setError("Wähle eine Hauptaufgabe, bevor du den Tag speicherst.");
      document.getElementById("main-task")?.focus();
      return;
    }
    const secondaryTitles = [draft.secondaryOne, draft.secondaryTwo]
      .map((item) => item.trim())
      .filter(Boolean);
    const editedSecondary = secondaryTitles.map((title, index) => {
      const existing = plan?.secondaryTasks[index];
      return {
        ...existing,
        id: existing?.id ?? newId(),
        title,
        completed: existing?.completed ?? false,
        completedAt: existing?.completedAt,
        status: existing?.status ?? "open" as const,
        section: existing?.section ?? "day" as const,
      };
    });
    savePlan({
      date,
      energy: draft.energy,
      mentalState: draft.mentalState,
      mainTask: {
        ...plan?.mainTask,
        id: plan?.mainTask.id ?? newId(),
        title: draft.mainTask.trim(),
        completed: plan?.mainTask.completed ?? false,
        completedAt: plan?.mainTask.completedAt,
        status: plan?.mainTask.status ?? "open",
        section: plan?.mainTask.section ?? "day",
        plannedTime: draft.startTime || undefined,
      },
      nextStep: draft.nextStep.trim(),
      secondaryTasks: [...editedSecondary, ...(plan?.secondaryTasks.slice(2) ?? [])],
      bodyActivity: draft.bodyActivity.trim() || undefined,
      bodyCompleted: plan?.bodyCompleted ?? false,
      meditationMinutes: draft.meditation === "skip" ? undefined : Number(draft.meditation),
      meditationSkipped: draft.meditation === "skip",
      meditationCompleted: plan?.meditationCompleted ?? false,
      courageousAction: draft.courageousAction.trim() || undefined,
      courageousCompleted: plan?.courageousCompleted ?? false,
      startTime: draft.startTime || undefined,
      reflection: plan?.reflection,
    });
    onDone();
    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <Card className="grid gap-6">
        <div>
          <p className="eyebrow">Tageskern</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
            {plan ? "Den Tag nachjustieren" : "Was soll heute wirklich zählen?"}
          </h2>
        </div>
        <div>
          <p className="eyebrow">Zustand · optional</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ChoiceChips
              label="Energie"
              value={draft.energy}
              options={[
                { value: "low", label: "Niedrig" },
                { value: "medium", label: "Mittel" },
                { value: "high", label: "Hoch" },
              ]}
              onChange={(value) => setDraft({ ...draft, energy: value as Energy })}
            />
            <ChoiceChips
              label="Mentale Unruhe"
              value={draft.mentalState}
              options={[
                { value: "calm", label: "Ruhig" },
                { value: "moving", label: "Bewegt" },
                { value: "overloaded", label: "Überladen" },
              ]}
              onChange={(value) => setDraft({ ...draft, mentalState: value as MentalState })}
            />
          </div>
        </div>

        <Field
          label="Hauptaufgabe"
          htmlFor="main-task"
          hint="Was macht diesen Tag erfolgreich, selbst wenn sonst wenig gelingt?"
          error={error}
        >
          <TextInput
            id="main-task"
            value={draft.mainTask}
            onChange={(event) => {
              setDraft({ ...draft, mainTask: event.target.value });
              setError("");
            }}
            maxLength={160}
            placeholder="Eine Sache, die heute zählt"
          />
        </Field>

        <Field
          label="Nächster konkreter Schritt"
          htmlFor="next-step"
          hint="Zum Beispiel: Dokument öffnen, Person anrufen, zehn Zeilen schreiben."
        >
          <TextInput
            id="next-step"
            value={draft.nextStep}
            onChange={(event) => setDraft({ ...draft, nextStep: event.target.value })}
            maxLength={180}
            placeholder="Die erste sichtbare Handlung"
          />
        </Field>

        <Field label="Startzeit" htmlFor="start-time" optional hint="Nur ein weicher Anker, kein Alarm.">
          <TextInput
            id="start-time"
            type="time"
            value={draft.startTime}
            onChange={(event) => setDraft({ ...draft, startTime: event.target.value })}
          />
        </Field>
      </Card>

      <Card className="grid gap-5">
        <div>
          <p className="eyebrow">Unterstützend</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">Nicht mehr als nötig</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nebenaufgabe 1" htmlFor="secondary-one" optional>
            <TextInput
              id="secondary-one"
              value={draft.secondaryOne}
              onChange={(event) => setDraft({ ...draft, secondaryOne: event.target.value })}
              maxLength={140}
            />
          </Field>
          <Field label="Nebenaufgabe 2" htmlFor="secondary-two" optional>
            <TextInput
              id="secondary-two"
              value={draft.secondaryTwo}
              onChange={(event) => setDraft({ ...draft, secondaryTwo: event.target.value })}
              maxLength={140}
            />
          </Field>
        </div>
        <Field label="Körper" htmlFor="body-activity" hint="Training, Spaziergang oder bewusste Erholung." optional>
          <TextInput
            id="body-activity"
            list="body-options"
            value={draft.bodyActivity}
            onChange={(event) => setDraft({ ...draft, bodyActivity: event.target.value })}
            maxLength={100}
            placeholder="Bewegung wählen oder eingeben"
          />
        </Field>
        <datalist id="body-options">
          {["Krafttraining", "Kampfsport", "Laufen", "Spaziergang", "Mobility", "Erholung"].map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <ChoiceChips
          label="Meditation"
          value={draft.meditation}
          options={[
            { value: "5", label: "5 Min" },
            { value: "10", label: "10 Min" },
            { value: "20", label: "20 Min" },
            { value: "skip", label: "Bewusst nicht" },
          ]}
          onChange={(value) => setDraft({ ...draft, meditation: value })}
        />
        <Field
          label="Mutige Handlung"
          htmlFor="courage"
          hint="Was würdest du heute nicht länger vermeiden?"
          optional
        >
          <TextInput
            id="courage"
            value={draft.courageousAction}
            onChange={(event) => setDraft({ ...draft, courageousAction: event.target.value })}
            maxLength={160}
          />
        </Field>
      </Card>

      <div className="flex gap-3">
        {plan && <Button type="button" variant="ghost" onClick={onDone}>Abbrechen</Button>}
        <Button type="submit" className="ml-auto">Tag speichern</Button>
      </div>
    </form>
  );
}

function CheckRow({
  checked,
  label,
  detail,
  disabled = false,
  onChange,
}: {
  checked: boolean;
  label: string;
  detail?: string;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <label className="group flex min-h-14 cursor-pointer items-start gap-4 border-b border-[var(--border)] py-4 last:border-0">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 size-6 shrink-0 accent-[var(--accent)] disabled:opacity-45"
      />
      <span className="min-w-0">
        <span className={checked ? "block text-[var(--text-muted)] line-through" : "block font-medium"}>{label}</span>
        {detail && <span className="mt-1 block text-sm text-[var(--text-muted)]">{detail}</span>}
      </span>
    </label>
  );
}

function RoutineCard({ instance }: { instance: RoutineInstance }) {
  const { toggleRoutineStep, setRoutineSkipped } = useAppStore();
  const completed = instance.steps.filter((step) => step.completed).length;
  const skipped = instance.status === "skipped";
  return (
    <div className={skipped ? "rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 opacity-75" : "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold">{instance.title}</h4>
            {instance.time && <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs text-[var(--accent)]">{instance.time}</span>}
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {skipped ? "Heute bewusst ausgelassen" : `${completed} von ${instance.steps.length} Schritten`}
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setRoutineSkipped(instance.id, !skipped)}
        >
          {skipped ? "Wieder aufnehmen" : "Heute auslassen"}
        </Button>
      </div>
      <div className="mt-3 divide-y divide-[var(--border)]">
        {instance.steps.map((step) => (
          <label key={step.id} className="flex min-h-12 cursor-pointer items-center gap-3 py-3">
            <input
              type="checkbox"
              checked={step.completed}
              disabled={skipped}
              aria-label={`${step.title} in ${instance.title}`}
              onChange={() => toggleRoutineStep(instance.id, step.id)}
              className="size-6 shrink-0 accent-[var(--accent)] disabled:opacity-45"
            />
            <span className={step.completed ? "text-sm text-[var(--text-muted)] line-through" : "text-sm font-medium"}>
              {step.title}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onOptions,
}: {
  task: Task;
  onToggle: () => void;
  onOptions: () => void;
}) {
  const status = resolvedTaskStatus(task);
  const inactive = status === "skipped" || status === "deferred";
  const statusDetail = status === "skipped"
    ? "Heute bewusst ausgelassen"
    : status === "deferred"
      ? `Auf ${task.deferredTo ? formatShortDate(task.deferredTo) : "einen anderen Tag"} verschoben`
      : undefined;
  return (
    <div className="flex min-h-16 items-start gap-3 border-b border-[var(--border)] py-3 last:border-0">
      <input
        type="checkbox"
        checked={status === "completed"}
        disabled={inactive}
        aria-label={task.title}
        onChange={onToggle}
        className="mt-1 size-6 shrink-0 accent-[var(--accent)] disabled:opacity-45"
      />
      <div className="min-w-0 flex-1">
        <p className={status === "completed" ? "text-[var(--text-muted)] line-through" : inactive ? "text-[var(--text-muted)]" : "font-medium"}>
          {task.title}
        </p>
        {(task.plannedTime || statusDetail) && (
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {[task.plannedTime, statusDetail].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      <Button size="icon" variant="ghost" aria-label={`Optionen für ${task.title}`} onClick={onOptions}>
        <span aria-hidden="true" className="text-xl leading-none">•••</span>
      </Button>
    </div>
  );
}

function AgendaSection({
  section,
  routines,
  tasks,
  anchors,
  hideWhenEmpty = false,
  onToggleTask,
  onTaskOptions,
}: {
  section: DaySection;
  routines: RoutineInstance[];
  tasks: Task[];
  anchors: ReactNode[];
  hideWhenEmpty?: boolean;
  onToggleTask: (task: Task) => void;
  onTaskOptions: (task: Task) => void;
}) {
  const labels = sectionLabels[section];
  const empty = !routines.length && !tasks.length && !anchors.length;
  if (empty && hideWhenEmpty) return null;
  return (
    <section aria-labelledby={`section-${section}`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{labels.eyebrow}</p>
          <h2 id={`section-${section}`}>{labels.title}</h2>
        </div>
      </div>
      <Card padding="none" className="overflow-hidden">
        {empty ? (
          <p className="px-5 py-6 text-sm text-[var(--text-muted)]">{labels.empty}</p>
        ) : (
          <div className="grid gap-3 p-4 sm:p-5">
            {routines.map((routine) => <RoutineCard key={routine.id} instance={routine} />)}
            {(tasks.length > 0 || anchors.length > 0) && (
              <div className="px-1">
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => onToggleTask(task)}
                    onOptions={() => onTaskOptions(task)}
                  />
                ))}
                {anchors}
              </div>
            )}
          </div>
        )}
      </Card>
    </section>
  );
}

function QuickTaskForm({ date }: { date: string }) {
  const { addPlanTask } = useAppStore();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [section, setSection] = useState<DaySection>("day");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Benenne die Aufgabe kurz.");
      return;
    }
    addPlanTask(date, { title, section, plannedTime: time || undefined });
    setTitle("");
    setTime("");
    setSection("day");
    setError("");
    setOpen(false);
  };

  if (!open) {
    return (
      <Button variant="secondary" className="justify-self-start" onClick={() => setOpen(true)}>
        Aufgabe hinzufügen
      </Button>
    );
  }
  return (
    <Card variant="muted">
      <form className="grid gap-5" onSubmit={save}>
        <Field label="Neue Aufgabe" htmlFor="quick-task" error={error || undefined}>
          <TextInput
            id="quick-task"
            value={title}
            onChange={(event) => { setTitle(event.target.value); setError(""); }}
            maxLength={180}
            autoFocus
            placeholder="Was soll sichtbar erledigt sein?"
          />
        </Field>
        <ChoiceChips
          label="Tagesabschnitt"
          value={section}
          options={[
            { value: "morning", label: "Morgen" },
            { value: "day", label: "Tag" },
            { value: "evening", label: "Abend" },
          ]}
          onChange={(value) => setSection(value as DaySection)}
        />
        <Field label="Uhrzeit" htmlFor="quick-task-time" optional>
          <TextInput id="quick-task-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </Field>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button type="submit">Hinzufügen</Button>
        </div>
      </form>
    </Card>
  );
}

function DailyReflection({ plan, date }: { plan: DailyPlan; date: string }) {
  const { updatePlanForDate } = useAppStore();
  const [open, setOpen] = useState(false);
  const [important, setImportant] = useState(plan.reflection?.important ?? "");
  const [leaveBehind, setLeaveBehind] = useState(plan.reflection?.leaveBehind ?? "");
  const [note, setNote] = useState(plan.reflection?.note ?? "");

  const save = (event: FormEvent) => {
    event.preventDefault();
    updatePlanForDate(date, (current) => ({
      ...current,
      reflection: { important, leaveBehind, note, completedAt: new Date().toISOString() },
    }));
    setOpen(false);
  };

  return (
    <Card>
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-between text-left"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>
          <span className="eyebrow block">Optional</span>
          <span className="mt-1 block text-lg font-semibold">Tag ruhig abschließen</span>
        </span>
        <span aria-hidden="true" className="text-2xl text-[var(--text-muted)]">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <form className="mt-6 grid gap-5 border-t border-[var(--border)] pt-6" onSubmit={save}>
          <Field label="Was wurde tatsächlich wichtig?" htmlFor="reflection-important">
            <TextArea id="reflection-important" rows={2} value={important} onChange={(event) => setImportant(event.target.value)} maxLength={300} />
          </Field>
          <Field label="Was nehme ich nicht mit in den Abend?" htmlFor="reflection-leave">
            <TextArea id="reflection-leave" rows={2} value={leaveBehind} onChange={(event) => setLeaveBehind(event.target.value)} maxLength={300} />
          </Field>
          <Field label="Kurze Notiz" htmlFor="reflection-note" optional>
            <TextArea id="reflection-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} maxLength={400} />
          </Field>
          <Button type="submit" className="justify-self-end">Abschluss speichern</Button>
        </form>
      )}
    </Card>
  );
}

export default function TodayPage() {
  const {
    state,
    ready,
    ensureRoutineInstances,
    updatePlanForDate,
    setTaskStatus,
    deferTask,
  } = useAppStore();
  const router = useRouter();
  const [view, setView] = useState<"day" | "routines" | "week">("day");
  const [selectedDate, setSelectedDate] = useState(localDateKey());
  const [editing, setEditing] = useState(false);
  const [carriedTask, setCarriedTask] = useState("");
  const [taskWithOptions, setTaskWithOptions] = useState<Task>();
  const now = useMemo(() => new Date(), []);
  const today = localDateKey(now);
  const selectedDateObject = new Date(`${selectedDate}T12:00:00`);
  const selectedPlan = state.plans.find((plan) => plan.date === selectedDate);
  const selectedRoutines = state.routineInstances.filter((instance) => instance.date === selectedDate);
  const weekKey = weekStartKey(selectedDate);
  const weekPlan = state.weekPlans.find((plan) => plan.weekKey === weekKey);
  const weeklyReview = state.weeklyReviews.find((review) => review.weekKey === weekKey);
  const weeklyAlignment = weekPlan?.focus || weeklyReview?.weeklyGoal;
  const stripStart = weekStartKey(selectedDate);
  const stripDays = Array.from({ length: 7 }, (_, index) => shiftLocalDate(stripStart, index));
  const phrase = dayPhrases[
    Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000)
      % dayPhrases.length
  ];
  const previousUnfinished = [...state.plans]
    .filter((plan) => plan.date < today && resolvedTaskStatus(plan.mainTask) === "open")
    .sort((left, right) => right.date.localeCompare(left.date))[0];

  useEffect(() => {
    if (ready) ensureRoutineInstances(selectedDate);
  }, [ensureRoutineInstances, ready, selectedDate, state.routines]);

  const taskItems = selectedPlan
    ? [selectedPlan.mainTask, ...selectedPlan.secondaryTasks].filter((task) =>
        ["open", "completed"].includes(resolvedTaskStatus(task)),
      )
    : [];
  const anchorStates = selectedPlan
    ? [
        selectedPlan.bodyActivity ? selectedPlan.bodyCompleted : undefined,
        !selectedPlan.meditationSkipped && selectedPlan.meditationMinutes
          ? selectedPlan.meditationCompleted
          : undefined,
        selectedPlan.courageousAction ? selectedPlan.courageousCompleted : undefined,
      ].filter((value): value is boolean => typeof value === "boolean")
    : [];
  const routineSteps = selectedRoutines
    .filter((routine) => routine.status === "active")
    .flatMap((routine) => routine.steps);
  const progressTotal = taskItems.length + anchorStates.length + routineSteps.length;
  const progressDone = taskItems.filter((task) => resolvedTaskStatus(task) === "completed").length
    + anchorStates.filter(Boolean).length
    + routineSteps.filter((step) => step.completed).length;
  const progressPercent = progressTotal ? Math.round((progressDone / progressTotal) * 100) : 0;

  const toggleTask = (task: Task) => {
    const nextStatus: PlannerItemStatus = resolvedTaskStatus(task) === "completed" ? "open" : "completed";
    setTaskStatus(selectedDate, task.id, nextStatus);
  };

  const anchorsFor = (section: DaySection): ReactNode[] => {
    if (!selectedPlan) return [];
    const anchors: ReactNode[] = [];
    if (selectedPlan.bodyActivity && sectionForTime(state.settings.trainingTime, "day") === section) {
      anchors.push(
        <CheckRow
          key="body"
          checked={selectedPlan.bodyCompleted}
          label={selectedPlan.bodyActivity}
          detail={`Körper${state.settings.trainingTime ? ` · ${state.settings.trainingTime}` : ""}`}
          onChange={() => updatePlanForDate(selectedDate, (plan) => ({ ...plan, bodyCompleted: !plan.bodyCompleted }))}
        />,
      );
    }
    if (
      !selectedPlan.meditationSkipped
      && selectedPlan.meditationMinutes
      && sectionForTime(state.settings.meditationTime, "morning") === section
    ) {
      anchors.push(
        <CheckRow
          key="meditation"
          checked={selectedPlan.meditationCompleted}
          label={`${selectedPlan.meditationMinutes} Minuten Meditation`}
          detail={`Präsenz${state.settings.meditationTime ? ` · ${state.settings.meditationTime}` : ""}`}
          onChange={() => updatePlanForDate(selectedDate, (plan) => ({ ...plan, meditationCompleted: !plan.meditationCompleted }))}
        />,
      );
    }
    if (selectedPlan.courageousAction && section === "day") {
      anchors.push(
        <CheckRow
          key="courage"
          checked={selectedPlan.courageousCompleted}
          label={selectedPlan.courageousAction}
          detail="Mutige Handlung"
          onChange={() => updatePlanForDate(selectedDate, (plan) => ({ ...plan, courageousCompleted: !plan.courageousCompleted }))}
        />,
      );
    }
    return anchors;
  };

  const chooseDate = (date: string) => {
    setSelectedDate(date);
    setEditing(false);
    setCarriedTask("");
    setTaskWithOptions(undefined);
  };

  const openDay = (date: string) => {
    chooseDate(date);
    setView("day");
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const agendaSections = (["morning", "day", "evening"] as const).map((section) => (
    <AgendaSection
      key={section}
      section={section}
      routines={selectedRoutines
        .filter((routine) => routine.section === section)
        .sort((left, right) => (left.time ?? "99:99").localeCompare(right.time ?? "99:99"))}
      tasks={(selectedPlan?.secondaryTasks ?? [])
        .filter((task) => (task.section ?? "day") === section)
        .sort((left, right) => (left.plannedTime ?? "99:99").localeCompare(right.plannedTime ?? "99:99"))}
      anchors={anchorsFor(section)}
      hideWhenEmpty={!selectedPlan}
      onToggleTask={toggleTask}
      onTaskOptions={setTaskWithOptions}
    />
  ));

  return (
    <div className="page-stack">
      <header className="page-header mb-0">
        <p className="eyebrow capitalize">
          {view === "day" ? formatDate(selectedDateObject) : view === "routines" ? "Dein Rhythmus" : "Deine Woche"}
        </p>
        <h1>
          {view === "day"
            ? selectedDate === today
              ? `${greeting(now)}${state.settings.name ? `, ${state.settings.name}` : ""}.`
              : `Plan für ${new Intl.DateTimeFormat("de-CH", { weekday: "long" }).format(selectedDateObject)}.`
            : view === "routines"
              ? "Wiederholen, was dich trägt."
              : "Die Woche in Ruhe ausrichten."}
        </h1>
        <p>
          {view === "day"
            ? selectedDate === today ? phrase : "Vorbereiten, ohne den Tag schon festzuschreiben."
            : view === "routines"
              ? "Kleine wiederkehrende Schritte statt zusätzlicher Willenskraft."
              : "Ein Fokus, wenige Ergebnisse, bewusste Tage."}
        </p>
      </header>

      <nav className="segmented-tabs" aria-label="Planerbereiche">
        {([
          ["day", "Tag"],
          ["routines", "Routinen"],
          ["week", "Woche"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-current={view === value ? "page" : undefined}
            onClick={() => setView(value)}
          >
            {label}
          </button>
        ))}
      </nav>

      {view === "routines" && <RoutinePlanner />}
      {view === "week" && <WeekPlanner onOpenDay={openDay} />}

      {view === "day" && (
        <>
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Vorherige Woche"
                onClick={() => chooseDate(shiftLocalDate(selectedDate, -7))}
              >
                <span aria-hidden="true">←</span>
              </Button>
              <p className="text-sm font-medium text-[var(--text-muted)]">
                Woche ab {new Intl.DateTimeFormat("de-CH", { day: "numeric", month: "long" }).format(new Date(`${stripStart}T12:00:00`))}
              </p>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Nächste Woche"
                onClick={() => chooseDate(shiftLocalDate(selectedDate, 7))}
              >
                <span aria-hidden="true">→</span>
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Tag auswählen">
              {stripDays.map((date) => {
                const dateObject = new Date(`${date}T12:00:00`);
                const active = date === selectedDate;
                return (
                  <button
                    key={date}
                    type="button"
                    aria-pressed={active}
                    aria-label={formatDate(dateObject)}
                    onClick={() => chooseDate(date)}
                    className="grid min-h-16 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-1 py-2 text-center aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--accent-soft)]"
                  >
                    <span className="text-[0.65rem] font-semibold uppercase text-[var(--text-muted)]">
                      {new Intl.DateTimeFormat("de-CH", { weekday: "short" }).format(dateObject).replace(".", "")}
                    </span>
                    <span className="text-sm font-semibold">{dateObject.getDate()}</span>
                    {date === today && <span className="size-1.5 rounded-full bg-[var(--accent)]" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            {selectedDate !== today && (
              <Button size="sm" variant="ghost" className="justify-self-center" onClick={() => chooseDate(today)}>
                Zurück zu heute
              </Button>
            )}
          </div>

          {weeklyAlignment && (
            <aside className="flex items-start gap-3 rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm">
              <span className="mt-1 size-2 shrink-0 rounded-full bg-[var(--accent)]" />
              <div><span className="font-medium">Ausrichtung dieser Woche:</span> {weeklyAlignment}</div>
            </aside>
          )}

          <Card variant="accent" aria-live="polite">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Tagesfortschritt</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
                  {progressTotal ? `${progressDone} von ${progressTotal} erledigt` : "Noch ohne feste Schritte"}
                </h2>
              </div>
              {progressTotal > 0 && <span className="text-sm tabular-nums text-[var(--text-muted)]">{progressPercent}%</span>}
            </div>
            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface)]"
              role="progressbar"
              aria-label="Tagesfortschritt"
              aria-valuemin={0}
              aria-valuemax={progressTotal}
              aria-valuenow={progressDone}
            >
              <div className="h-full rounded-full bg-[var(--accent)] transition-[width]" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              {progressTotal > 0 && progressDone === progressTotal
                ? "Für diesen Plan ist heute genug getan."
                : "Ohne Wertung – nur ein sichtbarer nächster Schritt."}
            </p>
          </Card>

          {!selectedPlan && !editing && selectedRoutines.length > 0 && agendaSections}

          {!selectedPlan || editing ? (
            <section aria-labelledby="plan-title">
              {!selectedPlan && (
                <div className="mb-6">
                  <h2 id="plan-title" className="text-2xl font-semibold tracking-[-0.03em]">Noch kein Tageskern.</h2>
                  <p className="mt-2 text-[var(--text-muted)]">
                    Routinen funktionieren trotzdem. Ergänze eine Hauptaufgabe, wenn du dem Tag Richtung geben möchtest.
                  </p>
                </div>
              )}
              {!selectedPlan && selectedDate === today && previousUnfinished && (
                <Card className="mb-5" variant="muted">
                  <p className="eyebrow">Offen geblieben</p>
                  <p className="mt-2 font-medium">{previousUnfinished.mainTask.title}</p>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">Übernimm es nur, wenn es heute wirklich zählt.</p>
                  <Button
                    className="mt-4"
                    size="sm"
                    variant="secondary"
                    onClick={() => setCarriedTask(previousUnfinished.mainTask.title)}
                  >
                    Bewusst übernehmen
                  </Button>
                </Card>
              )}
              <DailyPlanForm
                key={`${selectedPlan?.id ?? "new"}-${selectedDate}-${carriedTask}`}
                date={selectedDate}
                plan={selectedPlan}
                suggestedMain={carriedTask}
                onDone={() => setEditing(false)}
              />
            </section>
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="eyebrow">Das Wesentliche</p>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Bearbeiten</Button>
                </div>
                <div className="mt-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={resolvedTaskStatus(selectedPlan.mainTask) === "completed"}
                    disabled={["skipped", "deferred"].includes(resolvedTaskStatus(selectedPlan.mainTask))}
                    aria-label="Hauptaufgabe abschließen"
                    onChange={() => toggleTask(selectedPlan.mainTask)}
                    className="mt-1 size-7 shrink-0 accent-[var(--accent)] disabled:opacity-45"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className={resolvedTaskStatus(selectedPlan.mainTask) === "completed" ? "text-2xl font-semibold text-[var(--text-muted)] line-through" : "text-2xl font-semibold tracking-[-0.03em]"}>
                      {selectedPlan.mainTask.title}
                    </h2>
                    {selectedPlan.nextStep && (
                      <p className="mt-3 text-[var(--text-muted)]">
                        <span className="font-medium text-[var(--text)]">Nächster Schritt:</span> {selectedPlan.nextStep}
                      </p>
                    )}
                    {(selectedPlan.startTime || selectedPlan.mainTask.plannedTime) && (
                      <p className="mt-2 text-sm text-[var(--text-muted)]">Startanker · {selectedPlan.startTime ?? selectedPlan.mainTask.plannedTime}</p>
                    )}
                    {resolvedTaskStatus(selectedPlan.mainTask) === "skipped" && (
                      <p className="mt-2 text-sm text-[var(--text-muted)]">Heute bewusst ausgelassen.</p>
                    )}
                    {resolvedTaskStatus(selectedPlan.mainTask) === "deferred" && (
                      <p className="mt-2 text-sm text-[var(--text-muted)]">Auf {selectedPlan.mainTask.deferredTo ? formatShortDate(selectedPlan.mainTask.deferredTo) : "einen anderen Tag"} verschoben.</p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Optionen für ${selectedPlan.mainTask.title}`}
                    onClick={() => setTaskWithOptions(selectedPlan.mainTask)}
                  >
                    <span aria-hidden="true" className="text-xl">•••</span>
                  </Button>
                </div>
                {selectedDate === today && (
                  <Button
                    className="mt-6 w-full sm:w-auto"
                    onClick={() => router.push(`/focus?task=${selectedPlan.mainTask.id}`)}
                    disabled={resolvedTaskStatus(selectedPlan.mainTask) !== "open"}
                  >
                    {resolvedTaskStatus(selectedPlan.mainTask) === "completed"
                      ? "Erledigt"
                      : resolvedTaskStatus(selectedPlan.mainTask) === "skipped"
                        ? "Ausgelassen"
                        : resolvedTaskStatus(selectedPlan.mainTask) === "deferred"
                          ? "Verschoben"
                          : "Jetzt beginnen"}
                  </Button>
                )}
              </div>
            </Card>
          )}

          {selectedPlan && !editing && agendaSections}

          {selectedPlan && !editing && <QuickTaskForm date={selectedDate} />}

          {selectedDate === today && selectedPlan && !editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/focus?helper=1" className="action-link">
                <span><span className="eyebrow block">Starthelfer</span><strong className="mt-1 block">Ich komme nicht rein</strong></span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link href="/meditation" className="action-link">
                <span><span className="eyebrow block">Zurückkehren</span><strong className="mt-1 block">Meditation beginnen</strong></span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}

          {selectedPlan && !editing && <DailyReflection plan={selectedPlan} date={selectedDate} />}
        </>
      )}

      <Modal
        open={Boolean(taskWithOptions)}
        onClose={() => setTaskWithOptions(undefined)}
        title={taskWithOptions?.title ?? "Aufgabe"}
        description="Eine bewusste Entscheidung ist hilfreicher als ein still offener Punkt."
      >
        {taskWithOptions && (
          <div className="grid gap-3">
            {resolvedTaskStatus(taskWithOptions) === "skipped" ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setTaskStatus(selectedDate, taskWithOptions.id, "open");
                  setTaskWithOptions(undefined);
                }}
              >
                Wieder öffnen
              </Button>
            ) : resolvedTaskStatus(taskWithOptions) === "deferred" ? (
              <Button
                variant="secondary"
                disabled={!taskWithOptions.deferredTo}
                onClick={() => {
                  if (taskWithOptions.deferredTo) chooseDate(taskWithOptions.deferredTo);
                  setTaskWithOptions(undefined);
                }}
              >
                Zieltag öffnen
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setTaskStatus(selectedDate, taskWithOptions.id, "skipped");
                    setTaskWithOptions(undefined);
                  }}
                >
                  Heute bewusst auslassen
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    deferTask(selectedDate, taskWithOptions.id);
                    setTaskWithOptions(undefined);
                  }}
                >
                  Auf {formatShortDate(shiftLocalDate(selectedDate, 1))} verschieben
                </Button>
              </>
            )}
            <Button variant="ghost" onClick={() => setTaskWithOptions(undefined)}>Abbrechen</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
