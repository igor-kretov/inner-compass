"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import {
  localDateKey,
  resolvedTaskStatus,
  shiftLocalDate,
  useAppStore,
  weekStartKey,
  type WeekBacklogItem,
  type WeekPlan,
  type WeekPlanInput,
} from "@/lib/app-store";

type WeekDraft = WeekPlanInput;

function draftFrom(plan: WeekPlan | undefined, weekKey: string): WeekDraft {
  return {
    id: plan?.id,
    weekKey,
    focus: plan?.focus ?? "",
    outcomes: Array.from({ length: 3 }, (_, index) => plan?.outcomes[index] ?? ""),
    backlog: plan?.backlog.map((item) => ({ ...item })) ?? [{ title: "" }],
  };
}

function formatDay(dateKey: string, style: "short" | "long" = "short") {
  return new Intl.DateTimeFormat("de-CH", {
    weekday: style,
    day: "numeric",
    month: style === "long" ? "long" : "2-digit",
  }).format(new Date(`${dateKey}T12:00:00`));
}

export function WeekPlanner({
  onOpenDay,
}: {
  onOpenDay: (date: string) => void;
}) {
  const {
    state,
    saveWeekPlan,
    scheduleWeekItem,
    toggleWeekItem,
  } = useAppStore();
  const currentWeekKey = weekStartKey();
  const plan = state.weekPlans.find((item) => item.weekKey === currentWeekKey);
  const [editing, setEditing] = useState(!plan);
  const [draft, setDraft] = useState<WeekDraft>(() => draftFrom(plan, currentWeekKey));
  const [scheduleCandidate, setScheduleCandidate] = useState<WeekBacklogItem>();
  const days = Array.from({ length: 7 }, (_, index) => shiftLocalDate(currentWeekKey, index));

  const startEditing = () => {
    setDraft(draftFrom(plan, currentWeekKey));
    setEditing(true);
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    saveWeekPlan(draft);
    setEditing(false);
  };

  return (
    <div className="grid gap-7">
      {editing ? (
        <form className="grid gap-5" onSubmit={save}>
          <Card className="grid gap-6">
            <div>
              <p className="eyebrow">Diese Woche</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Richtung vor Dichte.</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Ein Fokus, bis zu drei Ergebnisse und ein kleiner Parkplatz. Alles darf leer bleiben.
              </p>
            </div>

            <Field
              label="Wichtigster Fokus"
              htmlFor="week-focus"
              optional
              hint="Woran möchtest du am Ende der Woche echten Fortschritt sehen?"
            >
              <TextInput
                id="week-focus"
                value={draft.focus}
                onChange={(event) => setDraft({ ...draft, focus: event.target.value })}
                maxLength={180}
                placeholder="Zum Beispiel: Angebot versenden"
              />
            </Field>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-semibold">Bis zu drei konkrete Ergebnisse</legend>
              {draft.outcomes.map((outcome, index) => (
                <TextInput
                  key={index}
                  aria-label={`Wochenergebnis ${index + 1}`}
                  value={outcome}
                  onChange={(event) => setDraft({
                    ...draft,
                    outcomes: draft.outcomes.map((item, itemIndex) =>
                      itemIndex === index ? event.target.value : item,
                    ),
                  })}
                  maxLength={180}
                  placeholder={`${index + 1}. sichtbares Ergebnis`}
                />
              ))}
            </fieldset>

            <fieldset className="grid gap-3 border-t border-[var(--border)] pt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <legend className="text-sm font-semibold">Aufgabenparkplatz</legend>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Erst bewusst einem Tag zuordnen, dann erscheint eine Aufgabe im Tagesplan.</p>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  {draft.backlog.length <= 10 ? `${draft.backlog.length}/10` : draft.backlog.length}
                </span>
              </div>
              {draft.backlog.map((item, index) => (
                <div key={item.id ?? `new-${index}`} className="flex items-center gap-2">
                  <TextInput
                    aria-label={`Wochenaufgabe ${index + 1}`}
                    value={item.title}
                    onChange={(event) => setDraft({
                      ...draft,
                      backlog: draft.backlog.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, title: event.target.value } : entry,
                      ),
                    })}
                    maxLength={180}
                    placeholder="Aufgabe für diese Woche"
                  />
                  {draft.backlog.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Wochenaufgabe ${index + 1} entfernen`}
                      onClick={() => setDraft({
                        ...draft,
                        backlog: draft.backlog.filter((_, entryIndex) => entryIndex !== index),
                      })}
                    >
                      <span aria-hidden="true" className="text-xl">−</span>
                    </Button>
                  )}
                </div>
              ))}
              {draft.backlog.length < 10 && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="justify-self-start"
                  onClick={() => setDraft({ ...draft, backlog: [...draft.backlog, { title: "" }] })}
                >
                  Wochenaufgabe hinzufügen
                </Button>
              )}
            </fieldset>
          </Card>
          <div className="flex justify-end gap-3">
            {plan && <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Abbrechen</Button>}
            <Button type="submit">Wochenplan speichern</Button>
          </div>
        </form>
      ) : plan ? (
        <div className="grid gap-4">
          <Card variant="accent">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Wochenfokus</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                  {plan.focus || "Bewusst offen gehalten"}
                </h2>
              </div>
              <Button size="sm" variant="ghost" onClick={startEditing}>Bearbeiten</Button>
            </div>
            {plan.outcomes.length > 0 && (
              <ol className="mt-5 grid gap-2 border-t border-[var(--accent-border)] pt-4 text-sm">
                {plan.outcomes.map((outcome, index) => (
                  <li key={`${outcome}-${index}`} className="flex gap-3">
                    <span className="text-[var(--accent)]">{index + 1}.</span>
                    <span>{outcome}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {plan.backlog.length > 0 && (
            <Card padding="none" className="overflow-hidden">
              <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
                <p className="eyebrow">Aufgabenparkplatz</p>
                <h3 className="mt-1 text-lg font-semibold">Bewusst einplanen, nicht automatisch verteilen.</h3>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {plan.backlog.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 px-5 py-4 sm:px-6">
                    <input
                      type="checkbox"
                      aria-label={`${item.title} als Wochenaufgabe erledigt`}
                      checked={item.status === "completed"}
                      onChange={() => toggleWeekItem(plan.id, item.id)}
                      className="mt-1 size-6 shrink-0 accent-[var(--accent)]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={item.status === "completed" ? "text-[var(--text-muted)] line-through" : "font-medium"}>{item.title}</p>
                      {item.scheduledDate && (
                        <p className="mt-1 text-xs text-[var(--text-muted)]">Eingeplant für {formatDay(item.scheduledDate, "long")}</p>
                      )}
                    </div>
                    {item.status !== "completed" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => item.scheduledDate ? onOpenDay(item.scheduledDate) : setScheduleCandidate(item)}
                      >
                        {item.scheduledDate ? "Tag öffnen" : "Einplanen"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : null}

      <section aria-labelledby="week-days-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Sieben Tage</p>
            <h2 id="week-days-title">Der aktuelle Wochenbogen</h2>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {days.map((date) => {
            const dayPlan = state.plans.find((item) => item.date === date);
            const tasks = dayPlan ? [dayPlan.mainTask, ...dayPlan.secondaryTasks] : [];
            const openTasks = tasks.filter((task) => resolvedTaskStatus(task) === "open").length;
            const weekday = new Date(`${date}T12:00:00`).getDay();
            const routines = state.routines.filter((routine) => routine.enabled && routine.weekdays.includes(weekday));
            const today = date === localDateKey();
            return (
              <Card
                key={date}
                padding="sm"
                variant={today ? "accent" : "default"}
                className="flex min-h-40 flex-col"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  {formatDay(date)}{today ? " · Heute" : ""}
                </p>
                <p className="mt-3 line-clamp-3 text-sm font-medium">
                  {dayPlan?.mainTask.title ?? "Noch frei"}
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                  {openTasks ? `${openTasks} offene Aufgabe${openTasks === 1 ? "" : "n"}` : dayPlan ? "Tagesaufgaben abgeschlossen" : ""}
                  {routines.length ? `${dayPlan ? " · " : ""}${routines.length} Routine${routines.length === 1 ? "" : "n"}` : ""}
                </p>
                <Button className="mt-auto w-full" size="sm" variant="ghost" onClick={() => onOpenDay(date)}>
                  {dayPlan ? "Tag öffnen" : "Tag planen"}
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      <Modal
        open={Boolean(scheduleCandidate)}
        onClose={() => setScheduleCandidate(undefined)}
        title="Welcher Tag passt?"
        description="Die Aufgabe wird bewusst in diesen Tagesplan übernommen. Bereits geplante Inhalte bleiben bestehen."
      >
        <div className="grid gap-2">
          {days.map((date) => (
            <Button
              key={date}
              variant={scheduleCandidate?.scheduledDate === date ? "primary" : "secondary"}
              className="justify-between"
              onClick={() => {
                if (plan && scheduleCandidate) scheduleWeekItem(plan.id, scheduleCandidate.id, date);
                setScheduleCandidate(undefined);
              }}
            >
              <span>{formatDay(date, "long")}</span>
              {date === localDateKey() && <span className="text-xs opacity-75">Heute</span>}
            </Button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
