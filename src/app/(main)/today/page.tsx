"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { IdentityCompass } from "@/components/identity/identity-compass";
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
  type PlannerItemStatus,
  type RoutineInstance,
  type Task,
} from "@/lib/app-store";
import { collectIdentityEvidence } from "@/lib/identity";

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
  secondaryTasks: Array<{
    draftId: string;
    taskId?: string;
    title: string;
  }>;
  bodyActivity: string;
  meditation: string;
  courageousAction: string;
  startTime: string;
};

function draftFrom(plan?: DailyPlan, suggestedMain = ""): PlanDraft {
  const secondaryTasks: PlanDraft["secondaryTasks"] = (plan?.secondaryTasks ?? []).map((task) => ({
    draftId: task.id,
    taskId: task.id,
    title: task.title,
  }));
  while (secondaryTasks.length < 2) {
    secondaryTasks.push({ draftId: `secondary-empty-${secondaryTasks.length + 1}`, title: "" });
  }
  return {
    mainTask: plan?.mainTask.title ?? suggestedMain,
    nextStep: plan?.nextStep ?? "",
    secondaryTasks,
    bodyActivity: plan?.bodyActivity ?? "",
    meditation: plan?.meditationSkipped
      ? "skip"
      : plan?.meditationMinutes
        ? String(plan.meditationMinutes)
        : "10",
    courageousAction: plan?.courageousAction ?? "",
    startTime: plan?.startTime ?? plan?.mainTask.plannedTime ?? "",
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
  const { savePlan, state } = useAppStore();
  const [draft, setDraft] = useState(() => draftFrom(plan, suggestedMain));
  const [error, setError] = useState("");
  const today = localDateKey();
  const tomorrow = shiftLocalDate(today, 1);
  const isFuturePlan = date > today;
  const movementOptions = state.settings.movementCategories.map((category) => ({
    value: category,
    label: category,
  }));
  const identity = state.settings.identity;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.mainTask.trim()) {
      setError("Wähle eine Hauptaufgabe, bevor du den Tag speicherst.");
      document.getElementById("main-task")?.focus();
      return;
    }
    const editedSecondary = draft.secondaryTasks.flatMap((item) => {
      const title = item.title.trim();
      if (!title) return [];
      const existing = item.taskId
        ? plan?.secondaryTasks.find((task) => task.id === item.taskId)
        : undefined;
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
      energy: plan?.energy,
      mentalState: plan?.mentalState,
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
      secondaryTasks: editedSecondary,
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
          <p className="eyebrow">{isFuturePlan ? "Im Voraus planen" : "Tageskern"}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
            {plan
              ? date === tomorrow ? "Den Plan für morgen nachjustieren" : "Den Tag nachjustieren"
              : date === tomorrow ? "Was soll morgen wirklich zählen?" : "Was soll heute wirklich zählen?"}
          </h2>
          {isFuturePlan && (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Heute in Ruhe entscheiden. Morgen direkt mit einem klaren Plan starten.
            </p>
          )}
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

        {identity && draft.mainTask.trim() && (
          <aside className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-4 text-sm leading-6">
            <p className="font-medium">{date === tomorrow ? "Morgen übst du" : "Heute übst du"}: {identity.statement}</p>
            <p className="mt-1 text-[var(--text-muted)]">
              Sichtbar durch: {draft.nextStep.trim() || draft.mainTask.trim()}
            </p>
          </aside>
        )}

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
        <div className="grid gap-4">
          {draft.secondaryTasks.map((task, index) => (
            <div key={task.draftId} className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <Field label={`Nebenaufgabe ${index + 1}`} htmlFor={`secondary-${task.draftId}`} optional>
                <TextInput
                  id={`secondary-${task.draftId}`}
                  value={task.title}
                  onChange={(event) => setDraft({
                    ...draft,
                    secondaryTasks: draft.secondaryTasks.map((item) =>
                      item.draftId === task.draftId ? { ...item, title: event.target.value } : item,
                    ),
                  })}
                  maxLength={140}
                />
              </Field>
              {draft.secondaryTasks.length > 2 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraft({
                    ...draft,
                    secondaryTasks: draft.secondaryTasks.filter((item) => item.draftId !== task.draftId),
                  })}
                  aria-label={`Nebenaufgabe ${index + 1} entfernen`}
                >
                  Entfernen
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="justify-self-start"
            disabled={draft.secondaryTasks.length >= 30}
            onClick={() => setDraft({
              ...draft,
              secondaryTasks: [
                ...draft.secondaryTasks,
                { draftId: `secondary-${newId()}`, title: "" },
              ],
            })}
          >
            Weitere Nebenaufgabe
          </Button>
        </div>
        <ChoiceChips
          label="Bewegung auswählen"
          value={state.settings.movementCategories.includes(draft.bodyActivity) ? draft.bodyActivity : null}
          options={movementOptions}
          onChange={(value) => setDraft({ ...draft, bodyActivity: value })}
        />
        <Field
          label="Eigene Bewegungsart"
          htmlFor="body-activity"
          hint="Zum Beispiel Muay Thai. Nach dem Speichern steht sie künftig direkt zur Auswahl."
          optional
        >
          <TextInput
            id="body-activity"
            value={draft.bodyActivity}
            onChange={(event) => setDraft({ ...draft, bodyActivity: event.target.value })}
            maxLength={100}
            placeholder="Neue Bewegungsart eintragen"
          />
        </Field>
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
        <Button type="submit" className="ml-auto">
          {date === tomorrow ? "Plan für morgen speichern" : "Tag speichern"}
        </Button>
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
    <label className={disabled
      ? "group flex min-h-14 cursor-default items-start gap-4 border-b border-[var(--border)] py-4 opacity-70 last:border-0"
      : "group flex min-h-14 cursor-pointer items-start gap-4 border-b border-[var(--border)] py-4 last:border-0"}>
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

function RoutineCard({ instance, disabled = false }: { instance: RoutineInstance; disabled?: boolean }) {
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
          disabled={disabled}
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
              disabled={skipped || disabled}
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
  disabled = false,
  onToggle,
  onOptions,
}: {
  task: Task;
  disabled?: boolean;
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
        disabled={inactive || disabled}
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
      <Button size="icon" variant="ghost" disabled={disabled} aria-label={`Optionen für ${task.title}`} onClick={onOptions}>
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
  disabled = false,
  hideWhenEmpty = false,
  onToggleTask,
  onTaskOptions,
}: {
  section: DaySection;
  routines: RoutineInstance[];
  tasks: Task[];
  anchors: ReactNode[];
  disabled?: boolean;
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
            {routines.map((routine) => <RoutineCard key={routine.id} instance={routine} disabled={disabled} />)}
            {(tasks.length > 0 || anchors.length > 0) && (
              <div className="px-1">
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    disabled={disabled}
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
  const { state, updatePlanForDate } = useAppStore();
  const [open, setOpen] = useState(false);
  const [important, setImportant] = useState(plan.reflection?.important ?? "");
  const [leaveBehind, setLeaveBehind] = useState(plan.reflection?.leaveBehind ?? "");
  const [note, setNote] = useState(plan.reflection?.note ?? "");
  const [identityEvidence, setIdentityEvidence] = useState(plan.reflection?.identityEvidence ?? "");
  const automaticEvidence = collectIdentityEvidence(state)
    .filter((evidence) => evidence.date === date && evidence.type !== "reflection")
    .slice(0, 3);

  const save = (event: FormEvent) => {
    event.preventDefault();
    updatePlanForDate(date, (current) => ({
      ...current,
      reflection: {
        important,
        leaveBehind,
        note,
        identityEvidence,
        completedAt: new Date().toISOString(),
      },
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
          {state.settings.identity && (
            <div className="rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] p-4">
              <p className="eyebrow">Bereits erkannt</p>
              <h3 className="mt-1 font-semibold">Was du heute konkret bewiesen hast</h3>
              {automaticEvidence.length > 0 ? (
                <ul className="mt-3 grid gap-2 text-sm text-[var(--text-muted)]">
                  {automaticEvidence.map((evidence) => <li key={evidence.id}>• {evidence.label}</li>)}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[var(--text-muted)]">Noch kein Häkchen nötig. Auch ruhiges Zurückkehren darf heute der Beweis sein.</p>
              )}
            </div>
          )}
          <Field label={state.settings.identity ? "Welcher Moment zeigte heute, wie du handeln willst?" : "Was wurde tatsächlich wichtig?"} htmlFor="reflection-important">
            <TextArea id="reflection-important" rows={2} value={important} onChange={(event) => setImportant(event.target.value)} maxLength={300} />
          </Field>
          <Field label={state.settings.identity ? "Welche alte Geschichte lässt du heute hier?" : "Was nehme ich nicht mit in den Abend?"} htmlFor="reflection-leave">
            <TextArea id="reflection-leave" rows={2} value={leaveBehind} onChange={(event) => setLeaveBehind(event.target.value)} maxLength={300} />
          </Field>
          {state.settings.identity && (
            <Field label="Ein zusätzlicher persönlicher Beweis" htmlFor="reflection-identity-evidence" optional hint="Nur wenn etwas Wichtiges nicht automatisch erkannt wurde.">
              <TextArea id="reflection-identity-evidence" rows={2} value={identityEvidence} onChange={(event) => setIdentityEvidence(event.target.value)} maxLength={300} />
            </Field>
          )}
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
  const [now, setNow] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => localDateKey());
  const [editing, setEditing] = useState(false);
  const [carriedTask, setCarriedTask] = useState("");
  const [taskWithOptions, setTaskWithOptions] = useState<Task>();
  const today = localDateKey(now);
  const tomorrow = shiftLocalDate(today, 1);
  const selectedDateIsFuture = selectedDate > today;
  const selectedDateObject = new Date(`${selectedDate}T12:00:00`);
  const selectedPlan = state.plans.find((plan) => plan.date === selectedDate);
  const tomorrowPlan = state.plans.find((plan) => plan.date === tomorrow);
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

  useEffect(() => {
    const refreshLocalDay = () => {
      const refreshed = new Date();
      const refreshedDay = localDateKey(refreshed);
      setNow((previous) => {
        const previousDay = localDateKey(previous);
        if (previousDay !== refreshedDay) {
          setSelectedDate((current) => current === previousDay ? refreshedDay : current);
        }
        return refreshed;
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshLocalDay();
    };
    const interval = window.setInterval(refreshLocalDay, 60_000);
    window.addEventListener("focus", refreshLocalDay);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshLocalDay);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

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
    if (selectedDateIsFuture) return;
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
          disabled={selectedDateIsFuture}
          onChange={() => updatePlanForDate(selectedDate, (plan) => {
            const completed = !plan.bodyCompleted;
            return {
              ...plan,
              bodyCompleted: completed,
              bodyCompletedAt: completed ? new Date().toISOString() : undefined,
            };
          })}
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
          disabled={selectedDateIsFuture}
          onChange={() => updatePlanForDate(selectedDate, (plan) => {
            const completed = !plan.meditationCompleted;
            return {
              ...plan,
              meditationCompleted: completed,
              meditationCompletedAt: completed ? new Date().toISOString() : undefined,
            };
          })}
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
          disabled={selectedDateIsFuture}
          onChange={() => updatePlanForDate(selectedDate, (plan) => {
            const completed = !plan.courageousCompleted;
            return {
              ...plan,
              courageousCompleted: completed,
              courageousCompletedAt: completed ? new Date().toISOString() : undefined,
            };
          })}
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
      disabled={selectedDateIsFuture}
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

          {selectedDate === today && (
            <Card variant="muted" className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="eyebrow">Am Vorabend</p>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">
                  {tomorrowPlan ? "Morgen ist vorbereitet." : "Plane morgen, bevor der Tag beginnt."}
                </h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  {tomorrowPlan
                    ? tomorrowPlan.mainTask.title
                    : "Dann steht beim Aufstehen sofort fest, was zuerst zählt."}
                </p>
              </div>
              <Button
                variant={tomorrowPlan ? "secondary" : "primary"}
                onClick={() => chooseDate(tomorrow)}
              >
                {tomorrowPlan ? "Morgen ansehen" : "Morgen planen"}
              </Button>
            </Card>
          )}

          {selectedDate === today && (
            <IdentityCompass
              variant="compact"
              actionLabel={selectedPlan?.nextStep || selectedPlan?.mainTask.title}
            />
          )}

          {selectedDateIsFuture && (
            <aside className="flex items-start gap-3 rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-4 py-3 text-sm">
              <span className="mt-1 size-2 shrink-0 rounded-full bg-[var(--accent)]" />
              <div>
                <span className="font-medium">Planungsmodus:</span> Häkchen und Tagesabschluss werden erst an diesem Tag aktiv.
              </div>
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
                    disabled={selectedDateIsFuture || ["skipped", "deferred"].includes(resolvedTaskStatus(selectedPlan.mainTask))}
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
                    disabled={selectedDateIsFuture}
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

          {selectedPlan && !editing && !selectedDateIsFuture && (
            <DailyReflection
              key={`${selectedPlan.id}:${selectedDate}`}
              plan={selectedPlan}
              date={selectedDate}
            />
          )}
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
