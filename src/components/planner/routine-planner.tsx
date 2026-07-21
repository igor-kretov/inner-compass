"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field, TextInput } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import {
  useAppStore,
  type DaySection,
  type RoutineInput,
  type RoutineTemplate,
} from "@/lib/app-store";

const weekdayOptions = [
  { value: 1, short: "Mo", long: "Montag" },
  { value: 2, short: "Di", long: "Dienstag" },
  { value: 3, short: "Mi", long: "Mittwoch" },
  { value: 4, short: "Do", long: "Donnerstag" },
  { value: 5, short: "Fr", long: "Freitag" },
  { value: 6, short: "Sa", long: "Samstag" },
  { value: 0, short: "So", long: "Sonntag" },
] as const;

const sectionLabels: Record<DaySection, string> = {
  morning: "Morgen",
  day: "Tag",
  evening: "Abend",
};

function emptyDraft(): RoutineInput {
  return {
    title: "",
    section: "morning",
    time: "",
    weekdays: [1, 2, 3, 4, 5],
    steps: [{ title: "" }],
    enabled: true,
  };
}

function draftFrom(routine: RoutineTemplate): RoutineInput {
  return {
    id: routine.id,
    title: routine.title,
    section: routine.section,
    time: routine.time ?? "",
    weekdays: [...routine.weekdays],
    steps: routine.steps.map((step) => ({ ...step })),
    enabled: routine.enabled,
  };
}

function weekdaySummary(days: number[]) {
  if (days.length === 7) return "Täglich";
  if (days.length === 5 && [1, 2, 3, 4, 5].every((day) => days.includes(day))) {
    return "Montag bis Freitag";
  }
  return weekdayOptions
    .filter((day) => days.includes(day.value))
    .map((day) => day.short)
    .join(" · ");
}

export function RoutinePlanner() {
  const { state, upsertRoutine, deleteRoutine, toggleRoutineEnabled } = useAppStore();
  const [draft, setDraft] = useState<RoutineInput | null>(null);
  const [error, setError] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState<RoutineTemplate>();
  const routines = [...state.routines].sort((left, right) =>
    `${left.section}-${left.time ?? "99:99"}-${left.title}`.localeCompare(
      `${right.section}-${right.time ?? "99:99"}-${right.title}`,
    ),
  );

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    const steps = draft.steps.filter((step) => step.title.trim());
    if (!draft.title.trim()) {
      setError("Gib der Routine einen kurzen Namen.");
      return;
    }
    if (!draft.weekdays.length) {
      setError("Wähle mindestens einen Wochentag.");
      return;
    }
    if (!steps.length) {
      setError("Ergänze mindestens einen kleinen Schritt.");
      return;
    }
    upsertRoutine({ ...draft, steps });
    setDraft(null);
    setError("");
  };

  if (draft) {
    return (
      <form className="grid gap-5" onSubmit={save} noValidate>
        <Card className="grid gap-6">
          <div>
            <p className="eyebrow">Routinenvorlage</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
              {draft.id ? "Routine bearbeiten" : "Neue Routine"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Die Vorlage erscheint an den gewählten Tagen automatisch. Änderungen gelten ab dem nächsten neuen Vorkommen.
            </p>
          </div>

          <Field label="Name der Routine" htmlFor="routine-title" error={error || undefined}>
            <TextInput
              id="routine-title"
              value={draft.title}
              onChange={(event) => {
                setDraft({ ...draft, title: event.target.value });
                setError("");
              }}
              maxLength={100}
              placeholder="Zum Beispiel: Morgenstart"
            />
          </Field>

          <ChoiceChips
            label="Tagesabschnitt"
            value={draft.section}
            options={([
              ["morning", "Morgen"],
              ["day", "Tag"],
              ["evening", "Abend"],
            ] as const).map(([value, label]) => ({ value, label }))}
            onChange={(value) => setDraft({ ...draft, section: value as DaySection })}
          />

          <Field label="Uhrzeit" htmlFor="routine-time" optional hint="Ein weicher Startanker, keine Erinnerung.">
            <TextInput
              id="routine-time"
              type="time"
              value={draft.time ?? ""}
              onChange={(event) => setDraft({ ...draft, time: event.target.value })}
            />
          </Field>

          <fieldset className="grid gap-3">
            <legend className="text-sm font-semibold">Wochentage</legend>
            <div className="grid grid-cols-7 gap-1.5">
              {weekdayOptions.map((day) => {
                const selected = draft.weekdays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    aria-label={day.long}
                    aria-pressed={selected}
                    className="grid min-h-12 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold aria-pressed:border-[var(--accent)] aria-pressed:bg-[var(--accent-soft)] aria-pressed:text-[var(--accent)]"
                    onClick={() => {
                      const weekdays = selected
                        ? draft.weekdays.filter((value) => value !== day.value)
                        : [...draft.weekdays, day.value];
                      setDraft({ ...draft, weekdays });
                      setError("");
                    }}
                  >
                    {day.short}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <legend className="text-sm font-semibold">Kleine Schritte</legend>
              <span className="text-xs text-[var(--text-muted)]">{draft.steps.length}/6</span>
            </div>
            {draft.steps.map((step, index) => (
              <div key={step.id ?? `new-${index}`} className="flex items-center gap-2">
                <TextInput
                  aria-label={`Schritt ${index + 1}`}
                  value={step.title}
                  onChange={(event) => setDraft({
                    ...draft,
                    steps: draft.steps.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, title: event.target.value } : item,
                    ),
                  })}
                  maxLength={120}
                  placeholder={index === 0 ? "Zum Beispiel: Wasser trinken" : "Nächster Schritt"}
                />
                {draft.steps.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Schritt ${index + 1} entfernen`}
                    onClick={() => setDraft({
                      ...draft,
                      steps: draft.steps.filter((_, itemIndex) => itemIndex !== index),
                    })}
                  >
                    <span aria-hidden="true" className="text-xl">−</span>
                  </Button>
                )}
              </div>
            ))}
            {draft.steps.length < 6 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="justify-self-start"
                onClick={() => setDraft({ ...draft, steps: [...draft.steps, { title: "" }] })}
              >
                Schritt hinzufügen
              </Button>
            )}
          </fieldset>
        </Card>

        <div className="flex flex-wrap gap-3">
          {draft.id && (
            <Button
              type="button"
              variant="ghost"
              className="text-[var(--danger)]"
              onClick={() => setDeleteCandidate(state.routines.find((routine) => routine.id === draft.id))}
            >
              Routine löschen
            </Button>
          )}
          <div className="ml-auto flex gap-3">
            <Button type="button" variant="ghost" onClick={() => { setDraft(null); setError(""); }}>
              Abbrechen
            </Button>
            <Button type="submit">Routine speichern</Button>
          </div>
        </div>

        <Modal
          open={Boolean(deleteCandidate)}
          onClose={() => setDeleteCandidate(undefined)}
          title="Routine wirklich löschen?"
          description="Bereits protokollierte Tage bleiben erhalten. Künftige Vorkommen werden nicht mehr angelegt."
          footer={(
            <>
              <Button variant="ghost" onClick={() => setDeleteCandidate(undefined)}>Behalten</Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (deleteCandidate) deleteRoutine(deleteCandidate.id);
                  setDeleteCandidate(undefined);
                  setDraft(null);
                }}
              >
                Routine löschen
              </Button>
            </>
          )}
        >
          <p className="m-0 text-sm text-[var(--text-muted)]">{deleteCandidate?.title}</p>
        </Modal>
      </form>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Wiederkehrende Abläufe</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Routinen geben dem Tag Halt.</h2>
        </div>
        <Button size="sm" onClick={() => setDraft(emptyDraft())}>Neue Routine</Button>
      </div>

      {!routines.length ? (
        <Card variant="muted">
          <h3 className="text-lg font-semibold">Noch keine Routine angelegt.</h3>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-muted)]">
            Beginne mit einem kurzen Ablauf aus zwei oder drei Schritten – etwa Wasser, Medikamente und fünf Minuten Bewegung.
          </p>
          <Button className="mt-5" variant="secondary" onClick={() => setDraft(emptyDraft())}>
            Erste Routine anlegen
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {routines.map((routine) => (
            <Card key={routine.id} className={routine.enabled ? "" : "opacity-70"}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold tracking-[-0.02em]">{routine.title}</h3>
                    {!routine.enabled && (
                      <span className="rounded-full bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--text-muted)]">Pausiert</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {sectionLabels[routine.section]}
                    {routine.time ? ` · ${routine.time}` : ""}
                    {` · ${weekdaySummary(routine.weekdays)}`}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setDraft(draftFrom(routine))}>
                  Bearbeiten
                </Button>
              </div>
              <ol className="mt-5 grid gap-2 border-t border-[var(--border)] pt-4 text-sm">
                {routine.steps.map((step, index) => (
                  <li key={step.id} className="flex gap-3">
                    <span className="text-[var(--text-muted)]">{index + 1}.</span>
                    <span>{step.title}</span>
                  </li>
                ))}
              </ol>
              <Button
                className="mt-5"
                size="sm"
                variant="secondary"
                onClick={() => toggleRoutineEnabled(routine.id)}
              >
                {routine.enabled ? "Routine pausieren" : "Routine aktivieren"}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
