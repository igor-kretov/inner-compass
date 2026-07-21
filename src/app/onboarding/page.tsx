"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/form";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Progress } from "@/components/ui/progress";
import { useAppStore, type AppSettings } from "@/lib/app-store";

const anchors = ["Körper", "Arbeit", "Ruhe", "Beziehungen", "Mut", "Ordnung", "Kreativität", "Spiritualität"];

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
    anchors: state.settings.anchors,
  });

  const selectedAnchors = settings.anchors ?? [];
  const next = () => setStep((current) => Math.min(4, current + 1));
  const back = () => setStep((current) => Math.max(0, current - 1));
  const finish = () => {
    completeOnboarding(settings);
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
        <span className="text-sm tabular-nums text-[var(--text-muted)]">{step + 1} / 5</span>
      </header>

      <Progress value={step + 1} max={5} label={`Schritt ${step + 1} von 5`} />

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
            <Card className="mt-7 grid gap-5">
              <Field label="Tagesbeginn" htmlFor="day-start"><TextInput id="day-start" type="time" value={settings.dayStart} onChange={(event) => setSettings({ ...settings, dayStart: event.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Meditation" htmlFor="meditation-time"><TextInput id="meditation-time" type="time" value={settings.meditationTime} onChange={(event) => setSettings({ ...settings, meditationTime: event.target.value })} /></Field>
                <Field label="Training" htmlFor="training-time"><TextInput id="training-time" type="time" value={settings.trainingTime} onChange={(event) => setSettings({ ...settings, trainingTime: event.target.value })} /></Field>
              </div>
              <div className="grid grid-cols-[1fr_1fr] gap-4">
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
            <h1 id="onboarding-focus" className="text-3xl font-semibold tracking-[-0.035em]">Wie lange möchtest du meistens fokussieren?</h1>
            <p className="mt-3 text-[var(--text-muted)]">Ein Standard, keine Verpflichtung.</p>
            <ChoiceChips
              className="mt-7"
              label="Standard-Fokusdauer"
              value={String(settings.focusDuration ?? 50)}
              options={[25, 50, 90].map((minutes) => ({ value: String(minutes), label: `${minutes} Minuten` }))}
              onChange={(value) => setSettings({ ...settings, focusDuration: Number(value) as 25 | 50 | 90 })}
            />
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby="onboarding-anchors">
            <h1 id="onboarding-anchors" className="text-3xl font-semibold tracking-[-0.035em]">Was soll dich ausrichten?</h1>
            <p className="mt-3 text-[var(--text-muted)]">Wähle bis zu drei Lebensanker. Sie verändern nur dezente Hinweise.</p>
            <div className="mt-7 flex flex-wrap gap-3" role="group" aria-label="Persönliche Lebensanker">
              {anchors.map((anchor) => {
                const selected = selectedAnchors.includes(anchor);
                const disabled = !selected && selectedAnchors.length >= 3;
                return (
                  <button
                    key={anchor}
                    type="button"
                    aria-pressed={selected}
                    disabled={disabled}
                    className="chip"
                    onClick={() => setSettings({
                      ...settings,
                      anchors: selected ? selectedAnchors.filter((item) => item !== anchor) : [...selectedAnchors, anchor],
                    })}
                  >
                    {anchor}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-sm text-[var(--text-muted)]">{selectedAnchors.length} von 3 gewählt</p>
          </section>
        )}

        {step === 4 && (
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
        <Button className="ml-auto min-w-32" onClick={step === 4 ? finish : next}>
          {step === 4 ? "Heute klären" : "Weiter"}
        </Button>
      </footer>
    </main>
  );
}
