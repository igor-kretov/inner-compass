"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/form";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Progress } from "@/components/ui/progress";
import { useAppStore, type AppSettings } from "@/lib/app-store";
import { prepareIdentityProfile } from "@/lib/identity";

const identityOptions = [
  {
    statement: "Ich beginne klein und halte meine Zusagen.",
    action: "Ich mache den ersten sichtbaren Schritt.",
  },
  {
    statement: "Ich kehre ruhig zurück, wenn ich abdrifte.",
    action: "Ich benenne den kleinsten Wiedereinstieg.",
  },
  {
    statement: "Ich tue das Wichtige, bevor es dringend wird.",
    action: "Ich beginne mit dem Wesentlichen.",
  },
] as const;

export default function OnboardingPage() {
  const { state, completeOnboarding } = useAppStore();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState<Partial<AppSettings>>({
    dayStart: state.settings.dayStart,
    meditationTime: state.settings.meditationTime,
    trainingTime: state.settings.trainingTime,
    reviewDay: state.settings.reviewDay,
    reviewTime: state.settings.reviewTime,
    focusDuration: state.settings.focusDuration,
    identity: state.settings.identity ?? {
      statement: identityOptions[0].statement,
      action: identityOptions[0].action,
      startedAt: new Date().toISOString(),
      rehearsalDates: [],
    },
  });
  const [identityChoice, setIdentityChoice] = useState(() => {
    const current = state.settings.identity?.statement;
    return identityOptions.some((option) => option.statement === current)
      ? current
      : current
        ? "custom"
        : identityOptions[0].statement;
  });

  const next = () => setStep((current) => Math.min(3, current + 1));
  const back = () => setStep((current) => Math.max(0, current - 1));
  const finish = () => {
    const identityDraft = settings.identity;
    completeOnboarding({
      ...settings,
      identity: identityDraft
        ? prepareIdentityProfile({
            current: state.settings.identity,
            statement: identityDraft.statement,
            action: identityDraft.action,
          })
        : undefined,
    });
    router.replace("/today");
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-7 sm:px-8 sm:py-10">
      <header className="mb-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)]" aria-hidden="true">
            <span className="size-2 rounded-full bg-[var(--accent)] shadow-[0_0_0_5px_var(--accent-soft)]" />
          </span>
          <span className="font-semibold tracking-[-0.02em]">Inner Compass</span>
        </div>
        <span className="text-sm tabular-nums text-[var(--text-muted)]">{step + 1} / 4</span>
      </header>

      <Progress value={step + 1} max={4} label={`Schritt ${step + 1} von 4`} />

      <div className="flex flex-1 flex-col justify-center py-8">
        {step === 0 && (
          <section aria-labelledby="onboarding-purpose">
            <p className="mb-3 text-sm font-medium text-[var(--accent)]">Weniger analysieren. Klarer handeln.</p>
            <h1 id="onboarding-purpose" className="max-w-md text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
              Nur der nächste klare Schritt.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-[var(--text-muted)]">
              Inner Compass übersetzt Gedanken in klare Handlungen. Kein perfektes Leben. Eine ruhige Richtung für heute.
            </p>
          </section>
        )}

        {step === 1 && (
          <section aria-labelledby="onboarding-rhythm">
            <h1 id="onboarding-rhythm" className="text-3xl font-semibold tracking-[-0.035em]">Dein Tagesrhythmus</h1>
            <p className="mt-3 text-[var(--text-muted)]">Nur ungefähre Zeiten. Du kannst alles später ändern.</p>
            <Card className="mt-7 grid min-w-0 gap-5" role="group" aria-label="Zeitfenster für deinen Tagesrhythmus">
              <Field label="Tagesbeginn" htmlFor="day-start"><TextInput id="day-start" type="time" value={settings.dayStart} onChange={(event) => setSettings({ ...settings, dayStart: event.target.value })} /></Field>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <Field label="Meditation" htmlFor="meditation-time"><TextInput id="meditation-time" type="time" value={settings.meditationTime} onChange={(event) => setSettings({ ...settings, meditationTime: event.target.value })} /></Field>
                <Field label="Training" htmlFor="training-time"><TextInput id="training-time" type="time" value={settings.trainingTime} onChange={(event) => setSettings({ ...settings, trainingTime: event.target.value })} /></Field>
              </div>
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <Field label="Wochenreview" htmlFor="review-day">
                  <select id="review-day" className="control" value={settings.reviewDay} onChange={(event) => setSettings({ ...settings, reviewDay: event.target.value })}>
                    {["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"].map((day, index) => <option key={day} value={index}>{day}</option>)}
                  </select>
                </Field>
                <Field label="Uhrzeit" htmlFor="review-time"><TextInput id="review-time" type="time" value={settings.reviewTime} onChange={(event) => setSettings({ ...settings, reviewTime: event.target.value })} /></Field>
              </div>
            </Card>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="onboarding-focus">
            <h1 id="onboarding-focus" className="text-3xl font-semibold tracking-[-0.035em]">Wie willst du handeln, wenn es schwierig wird?</h1>
            <p className="mt-3 text-[var(--text-muted)]">Kein Etikett und kein perfektes Versprechen. Ein glaubwürdiger Satz, den du durch kleine Handlungen belegst.</p>
            <ChoiceChips
              className="mt-7"
              label="Deine Ausrichtung"
              value={identityChoice}
              options={[
                ...identityOptions.map((option) => ({ value: option.statement, label: option.statement })),
                { value: "custom", label: "Eigener Satz" },
              ]}
              onChange={(value) => {
                setIdentityChoice(value);
                const selected = identityOptions.find((option) => option.statement === value);
                setSettings({
                  ...settings,
                  identity: selected
                    ? {
                        ...settings.identity,
                        statement: selected.statement,
                        action: selected.action,
                        startedAt: settings.identity?.startedAt ?? new Date().toISOString(),
                        rehearsalDates: settings.identity?.rehearsalDates ?? [],
                      }
                    : {
                        ...settings.identity,
                        statement: "",
                        action: "",
                        startedAt: settings.identity?.startedAt ?? new Date().toISOString(),
                        rehearsalDates: settings.identity?.rehearsalDates ?? [],
                      },
                });
              }}
            />
            {identityChoice === "custom" && (
              <Field className="mt-5" label="Dein glaubwürdiger Satz" htmlFor="identity-statement">
                <TextInput
                  id="identity-statement"
                  autoFocus
                  value={settings.identity?.statement ?? ""}
                  onChange={(event) => setSettings({
                    ...settings,
                    identity: {
                      ...settings.identity,
                      statement: event.target.value,
                      startedAt: settings.identity?.startedAt ?? new Date().toISOString(),
                      rehearsalDates: settings.identity?.rehearsalDates ?? [],
                    },
                  })}
                  maxLength={240}
                  placeholder="Ich bin jemand, der …"
                />
              </Field>
            )}
            <Field className="mt-5" label="Wenn es schwierig wird, dann …" htmlFor="identity-action" optional>
              <TextInput
                id="identity-action"
                value={settings.identity?.action ?? ""}
                onChange={(event) => setSettings({
                  ...settings,
                  identity: {
                    ...settings.identity,
                    statement: settings.identity?.statement ?? "",
                    action: event.target.value,
                    startedAt: settings.identity?.startedAt ?? new Date().toISOString(),
                    rehearsalDates: settings.identity?.rehearsalDates ?? [],
                  },
                })}
                maxLength={240}
                placeholder="… mache ich den kleinsten sichtbaren Schritt."
              />
            </Field>
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby="onboarding-privacy">
            <p className="mb-3 text-sm font-medium text-[var(--accent)]">Deine Daten. Dein Gerät.</p>
            <h1 id="onboarding-privacy" className="text-3xl font-semibold tracking-[-0.035em]">Privat, lokal, ohne Konto.</h1>
            <Card className="mt-7">
              <ul className="grid gap-5 text-[var(--text-muted)]">
                <li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />Persönliche Einträge bleiben in Version 1 auf diesem Gerät.</li>
                <li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />Du brauchst kein Konto. Export und Import findest du in den Einstellungen.</li>
                <li className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />Inner Compass stellt keine Diagnose und ersetzt keine medizinische oder psychologische Hilfe.</li>
              </ul>
            </Card>
          </section>
        )}
      </div>

      <footer className="flex items-center gap-3 pb-[env(safe-area-inset-bottom)]">
        {step > 0 && <Button variant="ghost" onClick={back}>Zurück</Button>}
        <Button className="ml-auto min-w-32" disabled={step === 2 && !settings.identity?.statement.trim()} onClick={step === 3 ? finish : next}>
          {step === 3 ? "Heute klären" : "Weiter"}
        </Button>
      </footer>
    </main>
  );
}
