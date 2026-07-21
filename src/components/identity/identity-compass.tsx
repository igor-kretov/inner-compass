"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Button, buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextArea, TextInput } from "@/components/ui/form";
import { CompassMarkIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import {
  localDateKey,
  useAppStore,
  type IdentityProfile,
} from "@/lib/app-store";
import { collectIdentityEvidence, prepareIdentityProfile } from "@/lib/identity";

export type IdentityCompassProps = {
  variant?: "compact" | "full";
  actionLabel?: string;
};

const identityExamples = [
  "Ich beginne klein und halte meine Zusagen.",
  "Ich kehre ruhig zurück, wenn ich abdrifte.",
  "Ich tue das Wichtige, bevor es dringend wird.",
] as const;

const beliefQuestions = [
  "Gibt es einen sachlichen Grund dafür, dass dieser Satz immer stimmen muss?",
  "Könnte ich mich zumindest teilweise irren?",
  "Würde ich so über einen anderen Menschen in meiner Lage urteilen?",
  "Warum sollte ich weiter danach handeln, wenn es keinen guten Grund dafür gibt?",
] as const;

const dayInMilliseconds = 86_400_000;

function dateAtNoon(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`);
}

function shiftDateKey(dateKey: string, days: number) {
  const date = dateAtNoon(dateKey);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function formatDate(dateKey: string) {
  return new Intl.DateTimeFormat("de-CH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(dateAtNoon(dateKey));
}

function formatEvidenceDate(occurredAt: string, fallbackDate: string) {
  const parsed = new Date(occurredAt);
  if (Number.isNaN(parsed.getTime())) return formatDate(fallbackDate);
  return new Intl.DateTimeFormat("de-CH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function identityStartKey(identity: IdentityProfile) {
  const parsed = new Date(identity.startedAt);
  return Number.isNaN(parsed.getTime())
    ? localDateKey()
    : localDateKey(parsed);
}

function experimentPosition(startKey: string, todayKey: string) {
  const elapsed = Math.round(
    (dateAtNoon(todayKey).getTime() - dateAtNoon(startKey).getTime())
      / dayInMilliseconds,
  );
  return elapsed + 1;
}

export function IdentityCompass({
  variant = "compact",
  actionLabel,
}: IdentityCompassProps) {
  const { state, updateSettings } = useAppStore();
  const identity = state.settings.identity;
  const evidence = useMemo(() => collectIdentityEvidence(state), [state]);
  const latestEvidence = evidence[0];

  const [editorOpen, setEditorOpen] = useState(false);
  const [statementDraft, setStatementDraft] = useState("");
  const [actionDraft, setActionDraft] = useState("");
  const [statementError, setStatementError] = useState("");

  const [rehearsalOpen, setRehearsalOpen] = useState(false);
  const [rehearsalSeconds, setRehearsalSeconds] = useState(20);

  const [beliefOpen, setBeliefOpen] = useState(false);
  const [oldStoryDraft, setOldStoryDraft] = useState("");
  const [reframeDraft, setReframeDraft] = useState("");

  const today = localDateKey();
  const concreteAction = actionLabel?.trim()
    || identity?.action?.trim()
    || "den ersten kleinen Schritt";

  useEffect(() => {
    if (!rehearsalOpen || rehearsalSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setRehearsalSeconds((current) => Math.max(0, current - 1));
    }, 1_000);
    return () => window.clearTimeout(timer);
  }, [rehearsalOpen, rehearsalSeconds]);

  const openEditor = () => {
    setStatementDraft(identity?.statement ?? "");
    setActionDraft(identity?.action ?? "");
    setStatementError("");
    setEditorOpen(true);
  };

  const saveIdentity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const statement = statementDraft.trim();
    if (!statement) {
      setStatementError("Formuliere einen glaubwürdigen, beobachtbaren Satz.");
      document.getElementById("identity-statement")?.focus();
      return;
    }

    updateSettings({
      identity: prepareIdentityProfile({
        current: identity,
        statement,
        action: actionDraft.trim() || undefined,
      }),
    });
    setEditorOpen(false);
  };

  const openRehearsal = () => {
    setRehearsalSeconds(20);
    setRehearsalOpen(true);
  };

  const finishRehearsal = () => {
    if (!identity) return;
    const rehearsalDates = identity.rehearsalDates.includes(today)
      ? identity.rehearsalDates
      : [...identity.rehearsalDates, today];
    updateSettings({
      identity: {
        ...identity,
        rehearsalDates,
      },
    });
    setRehearsalOpen(false);
  };

  const openBeliefCheck = () => {
    setOldStoryDraft("");
    setReframeDraft(identity?.reframe ?? "");
    setBeliefOpen(true);
  };

  const saveBeliefCheck = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!identity) return;
    updateSettings({
      identity: {
        ...identity,
        reframe: reframeDraft.trim() || undefined,
      },
    });
    setOldStoryDraft("");
    setBeliefOpen(false);
  };

  const rehearsalStage = rehearsalSeconds > 15
    ? {
        eyebrow: "Ankommen",
        title: "Atme länger aus.",
        body: "Lass Kiefer und Schultern locker. Du musst gerade nichts erzwingen.",
      }
    : rehearsalSeconds > 7
      ? {
          eyebrow: "Den Anfang sehen",
          title: concreteAction,
          body: "Stell dir Ort, Körperhaltung und deine erste sichtbare Bewegung so konkret wie möglich vor.",
        }
      : rehearsalSeconds > 0
        ? {
            eyebrow: "Ruhig zurückkehren",
            title: "Eine Ablenkung darf auftauchen.",
            body: "Sieh, wie du sie bemerkst und ohne Drama zum nächsten kleinen Schritt zurückkehrst.",
          }
        : {
            eyebrow: "Probe abgeschlossen",
            title: "Der erste Schritt ist vertrauter.",
            body: "Die Vorstellung ist kein Test. Entscheidend bleibt die nächste konkrete Handlung.",
          };

  if (!identity) {
    return (
      <>
        <Card
          variant="muted"
          className={variant === "compact"
            ? "grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            : "grid gap-5"}
        >
          <div className="flex min-w-0 items-start gap-3">
            <span
              aria-hidden="true"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-surface-raised text-accent"
            >
              <CompassMarkIcon className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="eyebrow">Identitäts-Kompass</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-ink">
                Wie willst du handeln, wenn es schwierig wird?
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Kein Etikett und keine Bewertung. Ein glaubwürdiger Satz, den du durch kleine Handlungen belegst.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            className={variant === "compact" ? "w-full sm:w-auto" : "justify-self-start"}
            onClick={openEditor}
          >
            Ausrichtung festlegen
          </Button>
        </Card>

        <IdentityEditorModal
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          statementDraft={statementDraft}
          actionDraft={actionDraft}
          statementError={statementError}
          onStatementChange={(value) => {
            setStatementDraft(value);
            setStatementError("");
          }}
          onActionChange={setActionDraft}
          onSubmit={saveIdentity}
        />
      </>
    );
  }

  const startKey = identityStartKey(identity);
  const endKey = shiftDateKey(startKey, 20);
  const position = experimentPosition(startKey, today);
  const experimentFinished = position > 21;
  const calendarDays = Array.from({ length: 21 }, (_, index) => ({
    index,
    date: shiftDateKey(startKey, index),
  }));
  const rehearsedDates = new Set([
    ...identity.rehearsalDates,
    ...evidence.filter((item) => item.type === "rehearsal").map((item) => item.date),
  ]);

  return (
    <>
      <Card variant="accent" className="grid gap-5">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-accent-muted bg-surface-raised text-accent"
          >
            <CompassMarkIcon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Deine Ausrichtung</p>
            <h2 className="mt-1 text-xl font-semibold leading-7 tracking-[-0.025em] text-ink sm:text-2xl">
              {identity.statement}
            </h2>
            {identity.action ? (
              <p className="mt-2 text-sm leading-6 text-muted">
                <span className="font-semibold text-ink">Wenn es schwer wird:</span>{" "}
                {identity.action}
              </p>
            ) : null}
            {actionLabel?.trim() ? (
              <p className="mt-2 text-sm leading-6 text-muted">
                <span className="font-semibold text-ink">Jetzt sichtbar durch:</span>{" "}
                {actionLabel.trim()}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 rounded-card border border-line bg-surface/75 p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
              Automatische Belege
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{evidence.length}</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Keine Punkte. Nur beobachtbare Handlungen.
            </p>
          </div>
          <div className="border-t border-line pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-faint">
              Letzter Beleg
            </p>
            {latestEvidence ? (
              <>
                <p className="mt-1 text-sm font-semibold leading-5 text-ink">
                  {latestEvidence.label}
                </p>
                <time
                  className="mt-1 block text-xs text-muted"
                  dateTime={latestEvidence.occurredAt}
                >
                  {formatEvidenceDate(latestEvidence.occurredAt, latestEvidence.date)}
                </time>
              </>
            ) : (
              <p className="mt-1 text-sm leading-5 text-muted">
                Noch kein Beleg sichtbar. Der nächste kleine Schritt reicht.
              </p>
            )}
          </div>
        </div>

        {variant === "full" ? (
          <ExperimentCalendar
            startKey={startKey}
            endKey={endKey}
            position={position}
            finished={experimentFinished}
            today={today}
            days={calendarDays}
            rehearsedDates={rehearsedDates}
          />
        ) : (
          <div className="rounded-2xl border border-line bg-surface/75 px-4 py-3 text-sm text-muted">
            <span className="font-semibold text-ink">21-Tage-Experiment:</span>{" "}
            {experimentFinished
              ? `Review-Zeitraum bis ${formatDate(endKey)} abgeschlossen.`
              : `Kalendertag ${Math.max(1, position)} von 21.`}{" "}
            Keine Streak – ein ausgelassener Tag setzt nichts zurück.
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button fullWidth onClick={openRehearsal}>
            20-Sekunden-Probe
          </Button>
          <Button fullWidth variant="secondary" onClick={openEditor}>
            Ausrichtung bearbeiten
          </Button>
        </div>
      </Card>

      {variant === "full" ? (
        <div className="mt-5 grid gap-5">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Konkrete Erfahrungen</p>
                <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-ink">
                  Letzte Belege
                </h2>
              </div>
              <span className="rounded-full border border-line bg-surface-muted px-3 py-1 text-xs text-muted">
                automatisch erkannt
              </span>
            </div>
            {evidence.length ? (
              <ol className="mt-5 divide-y divide-line">
                {evidence.slice(0, 6).map((item) => (
                  <li key={item.id} className="flex min-h-14 items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-2 shrink-0 rounded-full bg-accent"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-5 text-ink">{item.label}</p>
                      <time
                        className="mt-1 block text-xs text-muted"
                        dateTime={item.occurredAt}
                      >
                        {formatEvidenceDate(item.occurredAt, item.date)}
                      </time>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm leading-6 text-muted">
                Erledigte Aufgaben, Fokusblöcke, Bewegung, Meditation und ruhiges Zurückkehren werden hier ohne Bewertung sichtbar.
              </p>
            )}
          </Card>

          {identity.reframe ? (
            <Card variant="muted">
              <p className="eyebrow">Glaubwürdige Neurahmung</p>
              <blockquote className="mt-2 text-lg font-semibold leading-7 text-ink">
                „{identity.reframe}“
              </blockquote>
              <p className="mt-3 text-sm text-muted">Erfahrung, kein festes Urteil.</p>
            </Card>
          ) : null}

          <Card className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div>
              <p className="eyebrow">Wenn eine alte Geschichte laut wird</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-ink">
                Einen Glaubenssatz ruhig prüfen
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Vier Fragen als Prüfhilfe – ohne Test, Diagnose oder Pflichtantworten.
              </p>
            </div>
            <Button variant="secondary" className="w-full sm:w-auto" onClick={openBeliefCheck}>
              Satz prüfen
            </Button>
          </Card>

          <Card variant="outlined">
            <details>
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus">
                <span>Kleines neutrales Experiment</span>
                <span aria-hidden="true" className="text-xl text-muted">+</span>
              </summary>
              <div className="border-t border-line pt-4 text-sm leading-6 text-muted">
                <p>
                  Zieh heute einmal den anderen Schuh zuerst an oder stelle einen alltäglichen Gegenstand bewusst an einen anderen Platz.
                </p>
                <p className="mt-2">
                  Nur eine kleine Erinnerung daran, dass Gewohntes veränderbar ist. Kein Häkchen und kein Tracking.
                </p>
              </div>
            </details>
          </Card>

          <Link
            href="/meditation"
            className={buttonClassName({
              variant: "secondary",
              size: "lg",
              fullWidth: true,
            })}
          >
            In der Meditation ausrichten
          </Link>
        </div>
      ) : null}

      <IdentityEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        statementDraft={statementDraft}
        actionDraft={actionDraft}
        statementError={statementError}
        onStatementChange={(value) => {
          setStatementDraft(value);
          setStatementError("");
        }}
        onActionChange={setActionDraft}
        onSubmit={saveIdentity}
      />

      <Modal
        open={rehearsalOpen}
        onClose={() => setRehearsalOpen(false)}
        title="20-Sekunden-Probe"
        description="Eine kurze mentale Vorbereitung, kein Leistungstest."
      >
        <div className="grid min-h-72 content-center text-center">
          <div aria-live="polite" aria-atomic="true">
            <p className="eyebrow">{rehearsalStage.eyebrow}</p>
            <h3 className="mt-3 text-2xl font-semibold leading-8 tracking-[-0.03em] text-ink">
              {rehearsalStage.title}
            </h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">
              {rehearsalStage.body}
            </p>
          </div>
          <div
            className="mx-auto mt-7 grid size-16 place-items-center rounded-full border border-accent-muted bg-accent-soft font-mono text-xl font-semibold tabular-nums text-ink"
            role="timer"
            aria-label={rehearsalSeconds > 0
              ? `${rehearsalSeconds} Sekunden verbleibend`
              : "Probe abgeschlossen"}
          >
            {rehearsalSeconds}
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setRehearsalOpen(false)}>
            Für heute schließen
          </Button>
          <Button disabled={rehearsalSeconds > 0} onClick={finishRehearsal}>
            Probe abschließen
          </Button>
        </div>
      </Modal>

      <Modal
        open={beliefOpen}
        onClose={() => setBeliefOpen(false)}
        title="Einen Satz ruhig prüfen"
        description="Die Fragen helfen beim Einordnen. Du musst sie nicht schriftlich beantworten."
      >
        <form className="grid gap-6" onSubmit={saveBeliefCheck}>
          <Field
            label="Alte Geschichte"
            htmlFor="identity-old-story"
            optional
            hint="Zum Beispiel: Ich bin nicht konsequent."
          >
            <TextArea
              id="identity-old-story"
              rows={2}
              value={oldStoryDraft}
              onChange={(event) => setOldStoryDraft(event.target.value)}
              maxLength={240}
            />
          </Field>

          <Card variant="muted" padding="sm">
            <p className="text-sm font-semibold text-ink">Vier Prüffragen</p>
            <ol className="mt-3 grid gap-3">
              {beliefQuestions.map((question, index) => (
                <li key={question} className="flex gap-3 text-sm leading-6 text-muted">
                  <span className="font-semibold tabular-nums text-accent">{index + 1}.</span>
                  <span>{question}</span>
                </li>
              ))}
            </ol>
          </Card>

          <div className="rounded-card border border-accent-muted bg-accent-soft p-4">
            <p className="font-semibold text-ink">Erfahrung, kein festes Urteil.</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Eine glaubwürdige Neurahmung muss nichts schönreden. Sie darf beschreiben, was du heute konkret übst.
            </p>
          </div>

          <Field
            label="Glaubwürdige Neurahmung"
            htmlFor="identity-reframe"
            optional
            hint={`Zum Beispiel: ${identity.statement}`}
          >
            <TextArea
              id="identity-reframe"
              rows={3}
              value={reframeDraft}
              onChange={(event) => setReframeDraft(event.target.value)}
              maxLength={240}
            />
          </Field>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setBeliefOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit">Neurahmung speichern</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function IdentityEditorModal({
  open,
  onClose,
  statementDraft,
  actionDraft,
  statementError,
  onStatementChange,
  onActionChange,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  statementDraft: string;
  actionDraft: string;
  statementError: string;
  onStatementChange: (value: string) => void;
  onActionChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Deine Ausrichtung"
      description="Ein glaubwürdiger, beobachtbarer Satz – ohne immer oder nie."
    >
      <form className="grid gap-6" onSubmit={onSubmit} noValidate>
        <div role="group" aria-label="Beispiele" className="grid gap-2">
          <p className="text-sm font-semibold text-ink">Schnell auswählen</p>
          {identityExamples.map((example) => (
            <Button
              key={example}
              variant="secondary"
              className="h-auto min-h-12 w-full justify-start whitespace-normal py-3 text-left"
              onClick={() => onStatementChange(example)}
            >
              {example}
            </Button>
          ))}
        </div>

        <Field
          label="So möchte ich handeln"
          htmlFor="identity-statement"
          hint="Beschreibe Verhalten, das du heute sehen könntest."
          error={statementError || undefined}
        >
          <TextArea
            id="identity-statement"
            rows={3}
            value={statementDraft}
            onChange={(event) => onStatementChange(event.target.value)}
            maxLength={240}
            placeholder="Ich bin jemand, der …"
          />
        </Field>

        <Field
          label="Wenn es schwer wird"
          htmlFor="identity-action"
          optional
          hint="Eine kleine Rückkehrhandlung, keine weitere Aufgabe."
        >
          <TextInput
            id="identity-action"
            value={actionDraft}
            onChange={(event) => onActionChange(event.target.value)}
            maxLength={180}
            placeholder="Ich atme aus und beginne für zehn Minuten."
          />
        </Field>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>Später</Button>
          <Button type="submit">Ausrichtung speichern</Button>
        </div>
      </form>
    </Modal>
  );
}

function ExperimentCalendar({
  startKey,
  endKey,
  position,
  finished,
  today,
  days,
  rehearsedDates,
}: {
  startKey: string;
  endKey: string;
  position: number;
  finished: boolean;
  today: string;
  days: Array<{ index: number; date: string }>;
  rehearsedDates: Set<string>;
}) {
  return (
    <div className="rounded-card border border-line bg-surface/75 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">21-Tage-Experiment</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            {finished
              ? `Orientierungszeitraum bis ${formatDate(endKey)}`
              : `Kalendertag ${Math.max(1, position)} von 21 · bis ${formatDate(endKey)}`}
          </p>
        </div>
        <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">
          {formatDate(startKey)}
        </span>
      </div>

      <ol className="mt-4 grid grid-cols-7 gap-1.5" aria-label="21 Kalendertage zur Orientierung">
        {days.map(({ index, date }) => {
          const isToday = date === today;
          const rehearsed = rehearsedDates.has(date);
          const dateObject = dateAtNoon(date);
          const weekday = new Intl.DateTimeFormat("de-CH", { weekday: "narrow" }).format(dateObject);
          return (
            <li
              key={date}
              aria-label={`Tag ${index + 1}, ${formatDate(date)}${isToday ? ", heute" : ""}${rehearsed ? ", Probe notiert" : ""}`}
              className={isToday
                ? "grid min-h-12 place-items-center rounded-xl border border-accent bg-accent-soft px-1 py-1 text-ink"
                : "grid min-h-12 place-items-center rounded-xl border border-line bg-surface-raised px-1 py-1 text-muted"}
            >
              <span className="text-[0.6rem] font-semibold uppercase">{weekday}</span>
              <span className="text-sm font-semibold tabular-nums">{dateObject.getDate()}</span>
              <span
                aria-hidden="true"
                className={rehearsed ? "size-1.5 rounded-full bg-accent" : "size-1.5"}
              />
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-xs leading-5 text-muted">
        Nur Kalender-Orientierung, keine Streak. Ein ausgelassener Tag setzt nichts zurück.
        {rehearsedDates.size ? " Ein Punkt markiert eine kurze mentale Probe." : ""}
      </p>
    </div>
  );
}
