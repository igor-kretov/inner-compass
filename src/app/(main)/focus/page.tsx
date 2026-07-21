"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field, TextArea, TextInput } from "@/components/ui/form";
import {
  formatClock,
  remainingMilliseconds,
  useAppStore,
  type FocusSession,
} from "@/lib/app-store";

const durationOptions = [10, 25, 50, 90];

function activeMinutes(session: FocusSession) {
  const end = new Date(session.endedAt ?? session.updatedAt).getTime();
  const start = new Date(session.startedAt).getTime();
  return Math.max(0, Math.min(session.durationMinutes, (end - start - session.totalPausedMs) / 60_000));
}

function playTone(enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 440;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.4);
  } catch {
    // Audio is optional and may be blocked by the browser.
  }
}

function ActiveFocus({ session }: { session: FocusSession }) {
  const { state, pauseFocus, resumeFocus, endFocus, updateFocus } = useAppStore();
  const [remaining, setRemaining] = useState(() => remainingMilliseconds(session));
  const [driftOpen, setDriftOpen] = useState(false);
  const [driftStep, setDriftStep] = useState(session.driftStep ?? "");
  const [pauseOnDrift, setPauseOnDrift] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const next = remainingMilliseconds(session);
      setRemaining(next);
      if (next === 0 && session.status === "running") {
        playTone(state.settings.sounds);
        if (state.settings.haptics && "vibrate" in navigator) navigator.vibrate?.([100, 80, 100]);
        endFocus(session.id);
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 500);
    return () => window.clearInterval(timer);
  }, [endFocus, session, state.settings.haptics, state.settings.sounds]);

  const openDrift = () => {
    setPauseOnDrift(session.status === "paused");
    setDriftOpen(true);
  };

  const returnForFive = () => {
    if (driftStep.trim()) updateFocus(session.id, { driftStep: driftStep.trim() });
    if (session.status === "paused") resumeFocus(session.id);
    setPauseOnDrift(false);
    setDriftOpen(false);
  };

  const changeDriftPause = (pause: boolean) => {
    setPauseOnDrift(pause);
    if (pause && session.status === "running") pauseFocus(session.id);
    if (!pause && session.status === "paused") resumeFocus(session.id);
  };

  return (
    <div className="fixed inset-0 z-[100] flex min-h-dvh flex-col bg-[var(--background)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-8">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <span className="eyebrow">Fokusblock</span>
        <Button variant="ghost" size="sm" onClick={() => endFocus(session.id)}>Block beenden</Button>
      </header>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center py-10 text-center">
        <p className="text-sm font-medium text-[var(--text-muted)]">{session.task}</p>
        <h1 className="mt-4 max-w-2xl text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{session.expectedOutcome}</h1>
        <div className="my-12 font-mono text-[clamp(4rem,18vw,8rem)] font-medium leading-none tracking-[-0.08em] tabular-nums" role="timer" aria-live="off" aria-label={`${Math.ceil(remaining / 60_000)} Minuten verbleibend`}>
          {formatClock(remaining)}
        </div>
        <p className="sr-only" aria-live="polite">{session.status === "paused" ? "Timer pausiert" : "Timer läuft"}</p>
        <div className="flex flex-wrap justify-center gap-3">
          {session.status === "paused" ? (
            <Button onClick={() => resumeFocus(session.id)}>Fortsetzen</Button>
          ) : (
            <Button variant="secondary" onClick={() => pauseFocus(session.id)}>Pause</Button>
          )}
          <Button variant="ghost" onClick={openDrift}>Ich bin abgedriftet</Button>
        </div>
      </div>
      <footer className="mx-auto w-full max-w-3xl text-center text-xs text-[var(--text-muted)]">Nur dieser Block. Nur der nächste Schritt.</footer>

      {driftOpen && (
        <div className="fixed inset-0 z-[110] grid place-items-end bg-black/40 p-3 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="drift-title">
          <Card className="w-full max-w-lg shadow-2xl">
            <p className="eyebrow">Zurückkehren</p>
            <h2 id="drift-title" className="mt-2 text-2xl font-semibold">Was ist der allerkleinste nächste Schritt?</h2>
            <Field className="mt-6" label="Ein kurzer Satz" htmlFor="drift-step">
              <TextInput id="drift-step" autoFocus value={driftStep} onChange={(event) => setDriftStep(event.target.value)} maxLength={160} placeholder="Zum Beispiel: die erste Zeile lesen" />
            </Field>
            <label className="mt-5 flex min-h-12 items-center gap-3 text-sm">
              <input type="checkbox" checked={pauseOnDrift} onChange={(event) => changeDriftPause(event.target.checked)} className="size-5 accent-[var(--accent)]" />
              Timer währenddessen pausieren
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDriftOpen(false)}>Schließen</Button>
              <Button onClick={returnForFive}>Für fünf Minuten zurückkehren</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function FocusReview({ session }: { session: FocusSession }) {
  const { completeFocus } = useAppStore();
  const [result, setResult] = useState<FocusSession["result"]>();
  const [nextStep, setNextStep] = useState("");
  const [bodyCheck, setBodyCheck] = useState("");
  const [error, setError] = useState("");
  const needsBodyCheck = session.durationMinutes >= 50;

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!result) {
      setError("Wähle, ob das Ergebnis erreicht wurde.");
      return;
    }
    if (needsBodyCheck && !bodyCheck) {
      setError("Wähle kurz, was dein Körper jetzt braucht.");
      return;
    }
    completeFocus(session.id, { result, nextStep: nextStep.trim() || undefined, bodyCheck: bodyCheck || undefined });
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[var(--background)] px-5 py-[max(2rem,env(safe-area-inset-top))]">
      <form className="mx-auto grid min-h-full w-full max-w-xl content-center gap-7" onSubmit={save}>
        <header>
          <p className="eyebrow">Fokus beendet</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Prüfe das Ergebnis, nicht dein Gefühl.</h1>
          <p className="mt-3 text-[var(--text-muted)]">{session.expectedOutcome}</p>
        </header>
        <Card className="grid gap-6">
          <ChoiceChips
            label="Ist das vorher definierte Ergebnis erreicht?"
            value={result}
            options={[
              { value: "yes", label: "Ja" },
              { value: "partly", label: "Teilweise" },
              { value: "no", label: "Nein" },
            ]}
            onChange={(value) => { setResult(value as FocusSession["result"]); setError(""); }}
          />
          <Field label="Was ist der nächste klare Schritt? · optional" htmlFor="focus-next"><TextInput id="focus-next" value={nextStep} onChange={(event) => setNextStep(event.target.value)} maxLength={180} /></Field>
          {needsBodyCheck && (
            <ChoiceChips
              label="Was braucht dein Körper jetzt?"
              value={bodyCheck}
              options={["Wasser", "Bewegen", "Essen", "Toilette", "Blick in die Ferne", "Nichts nötig"].map((label) => ({ value: label, label }))}
              onChange={(value) => { setBodyCheck(value); setError(""); }}
            />
          )}
          {error && <p className="text-sm text-[var(--danger)]" role="alert">{error}</p>}
        </Card>
        <Button type="submit" className="w-full">Abschluss speichern</Button>
      </form>
    </div>
  );
}

const helperReasons = [
  ["too-big", "Aufgabe ist zu groß"],
  ["boring", "Aufgabe ist langweilig"],
  ["unclear", "Ich weiß nicht, wo ich beginnen soll"],
  ["fear", "Ich habe Angst vor dem Ergebnis"],
  ["tired", "Ich bin erschöpft"],
  ["distracted", "Ich bin abgelenkt"],
  ["other", "Etwas anderes"],
] as const;

const helperGuidance: Record<string, { headline: string; prompt: string }> = {
  "too-big": { headline: "Verkleinere sie, bis du beginnen kannst.", prompt: "Welche Version passt in zehn Minuten?" },
  boring: { headline: "Du brauchst keine Lust. Du brauchst einen Anfang.", prompt: "Welchen zehnminütigen Einstieg wählst du?" },
  unclear: { headline: "Mach den Anfang sichtbar.", prompt: "Was wäre die erste sichtbare Handlung?" },
  fear: { headline: "Unperfekt darf heute ausreichend sein.", prompt: "Welche unperfekte Version wäre heute ausreichend?" },
  tired: { headline: "Ehrlich prüfen, sanft entscheiden.", prompt: "Fünf Minuten beginnen, kurz ruhen oder konkret verschieben?" },
  distracted: { headline: "Räume den Einstieg frei.", prompt: "Was entfernst du, bevor du beginnst?" },
  other: { headline: "Nur den nächsten Schritt klären.", prompt: "Was macht den Einstieg jetzt leichter?" },
};

function StartHelper({ initialTask, onClose }: { initialTask: string; onClose: () => void }) {
  const { startFocus } = useAppStore();
  const [step, setStep] = useState(0);
  const [task, setTask] = useState(initialTask);
  const [reason, setReason] = useState("");
  const [miniAction, setMiniAction] = useState("");
  const [distractionChecks, setDistractionChecks] = useState<string[]>([]);

  const guidance = helperGuidance[reason];
  const canContinue = step === 0 ? Boolean(task.trim()) : step === 1 ? Boolean(reason) : true;
  const start = () => {
    if (!miniAction.trim()) return;
    startFocus({ task: task.trim(), expectedOutcome: miniAction.trim(), durationMinutes: 10 });
  };

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[var(--background)] px-5 py-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <div><p className="eyebrow">Starthelfer · {step + 1} / 5</p><h1 className="mt-1 text-2xl font-semibold">Ich komme nicht rein</h1></div>
          <Button variant="ghost" size="sm" onClick={onClose}>Schließen</Button>
        </header>
        <div className="flex flex-1 flex-col justify-center py-10">
          {step === 0 && <div><h2 className="text-3xl font-semibold tracking-[-0.035em]">Was vermeidest du gerade?</h2><Field className="mt-7" label="Aufgabe" htmlFor="helper-task"><TextInput id="helper-task" autoFocus value={task} onChange={(event) => setTask(event.target.value)} maxLength={180} /></Field></div>}
          {step === 1 && <div><h2 className="text-3xl font-semibold tracking-[-0.035em]">Warum hängt es?</h2><div className="mt-7 grid gap-2" role="radiogroup" aria-label="Grund"><ChoiceChips label="Grund auswählen" value={reason} options={helperReasons.map(([value, label]) => ({ value, label }))} onChange={setReason} /></div></div>}
          {step === 2 && guidance && <div><p className="eyebrow">Einordnen</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">{guidance.headline}</h2><p className="mt-5 text-lg text-[var(--text-muted)]">{guidance.prompt}</p>{reason === "distracted" && <div className="mt-7 grid gap-2">{["Handy außer Reichweite", "Unnötige Tabs schließen", "Kopfhörer", "Timer starten"].map((item) => <label key={item} className="flex min-h-12 items-center gap-3"><input type="checkbox" className="size-5 accent-[var(--accent)]" checked={distractionChecks.includes(item)} onChange={() => setDistractionChecks((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])} />{item}</label>)}</div>}</div>}
          {step === 3 && guidance && <div><h2 className="text-3xl font-semibold tracking-[-0.035em]">Mach daraus eine Mini-Handlung.</h2><Field className="mt-7" label={guidance.prompt} htmlFor="mini-action"><TextArea id="mini-action" autoFocus rows={3} value={miniAction} onChange={(event) => setMiniAction(event.target.value)} maxLength={180} placeholder="So klein und sichtbar wie möglich" /></Field></div>}
          {step === 4 && <Card><p className="eyebrow">Zehn-Minuten-Start</p><h2 className="mt-3 text-2xl font-semibold">{task}</h2><p className="mt-3 text-[var(--text-muted)]">Sichtbares Ergebnis: {miniAction}</p><p className="mt-6 border-t border-[var(--border)] pt-5 text-sm text-[var(--text-muted)]">Du musst die Aufgabe nicht vollständig lösen. Du musst nur beginnen.</p></Card>}
        </div>
        <footer className="flex gap-3 pb-[env(safe-area-inset-bottom)]">
          {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Zurück</Button>}
          <Button className="ml-auto" disabled={!canContinue || (step === 3 && !miniAction.trim())} onClick={step === 4 ? start : () => setStep(step + 1)}>{step === 4 ? "10-Minuten-Start beginnen" : "Weiter"}</Button>
        </footer>
      </div>
    </div>
  );
}

function FocusHome() {
  const search = useSearchParams();
  const { state, todayPlan, activeFocus, startFocus } = useAppStore();
  const requestedId = search.get("task");
  const requestedTask = requestedId === todayPlan?.mainTask.id
    ? todayPlan.mainTask
    : todayPlan?.secondaryTasks.find((task) => task.id === requestedId);
  const [selectedTaskId, setSelectedTaskId] = useState(requestedTask?.id ?? todayPlan?.mainTask.id ?? "free");
  const [freeTask, setFreeTask] = useState("");
  const [outcome, setOutcome] = useState(requestedTask?.id === todayPlan?.mainTask.id ? todayPlan?.nextStep ?? "" : "");
  const [duration, setDuration] = useState(String(search.get("duration") ?? state.settings.focusDuration));
  const [customDuration, setCustomDuration] = useState(35);
  const [error, setError] = useState("");
  const [helperOpen, setHelperOpen] = useState(search.get("helper") === "1");
  const [breakChoice, setBreakChoice] = useState("");

  const tasks = useMemo(() => [
    ...(todayPlan ? [{ id: todayPlan.mainTask.id, title: todayPlan.mainTask.title }, ...todayPlan.secondaryTasks.map((task) => ({ id: task.id, title: task.title }))] : []),
  ], [todayPlan]);
  const selected = tasks.find((task) => task.id === selectedTaskId);
  const recentSessions = state.focusSessions.filter((session) => session.status === "completed" && new Date().getTime() - new Date(session.endedAt ?? session.updatedAt).getTime() < 3 * 60 * 60_000);
  const recentMinutes = Math.floor(recentSessions.reduce((total, session) => total + activeMinutes(session), 0));
  const needsBreak = recentSessions.length >= 2 || recentMinutes >= 120;

  if (activeFocus?.status === "running" || activeFocus?.status === "paused") return <ActiveFocus session={activeFocus} />;
  if (activeFocus?.status === "review") return <FocusReview session={activeFocus} />;

  const begin = (event: FormEvent) => {
    event.preventDefault();
    const task = selectedTaskId === "free" ? freeTask.trim() : selected?.title ?? "";
    const minutes = duration === "custom" ? customDuration : Number(duration);
    if (!task) { setError("Wähle oder benenne eine Aufgabe."); return; }
    if (!outcome.trim()) { setError("Beschreibe kurz, was am Ende sichtbar fertig sein soll."); return; }
    if (needsBreak && !breakChoice) { setError("Wähle zuerst eine bewusste Körper-Unterbrechung."); return; }
    playTone(state.settings.sounds);
    startFocus({ task, taskId: selectedTaskId === "free" ? undefined : selectedTaskId, expectedOutcome: outcome.trim(), durationMinutes: minutes });
  };

  const helperTask = selectedTaskId === "free" ? freeTask : selected?.title ?? todayPlan?.mainTask.title ?? "";

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Fokus</p>
        <h1>Ein Ergebnis. Ein Block.</h1>
        <p>Definiere sichtbar, was am Ende fertig sein soll.</p>
      </header>

      {needsBreak && (
        <Card className="border-[var(--accent-border)] bg-[var(--accent-soft)]">
          <p className="eyebrow">Bewusste Unterbrechung</p>
          <h2 className="mt-2 text-xl font-semibold">Fokus ist wertvoll. Jetzt kurz zurück in den Körper.</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Du hast in kurzer Zeit {recentSessions.length} Blöcke mit {recentMinutes} geplanten Minuten abgeschlossen.</p>
          <ChoiceChips className="mt-5" label="Was tust du jetzt?" value={breakChoice} options={["5 Minuten gehen", "Wasser holen", "Etwas essen", "Mobility", "Bewusst weitermachen"].map((label) => ({ value: label, label }))} onChange={(value) => { setBreakChoice(value); setError(""); }} />
        </Card>
      )}

      <form onSubmit={begin} className="grid gap-5">
        <Card className="grid gap-6">
          <ChoiceChips
            label="Aufgabe"
            value={selectedTaskId}
            options={[...tasks.map((task, index) => ({ value: task.id, label: index === 0 ? `Hauptaufgabe · ${task.title}` : task.title })), { value: "free", label: "Freie Aufgabe" }]}
            onChange={(value) => { setSelectedTaskId(value); setError(""); }}
          />
          {selectedTaskId === "free" && <Field label="Freie Aufgabe" htmlFor="free-focus-task"><TextInput id="free-focus-task" value={freeTask} onChange={(event) => setFreeTask(event.target.value)} maxLength={180} /></Field>}
          <Field label="Was soll am Ende dieses Blocks sichtbar fertig sein?" htmlFor="focus-outcome" error={error && outcome.trim() === "" ? error : undefined}>
            <TextArea id="focus-outcome" rows={3} value={outcome} onChange={(event) => { setOutcome(event.target.value); setError(""); }} maxLength={240} placeholder="Ein konkret prüfbares Ergebnis" />
          </Field>
          <ChoiceChips label="Dauer" value={duration} options={[...durationOptions.map((minutes) => ({ value: String(minutes), label: minutes === 10 ? "10 Min Einstieg" : `${minutes} Min` })), { value: "custom", label: "Eigene" }]} onChange={setDuration} />
          {duration === "custom" && <Field label="Eigene Dauer · 5 bis 120 Minuten" htmlFor="custom-duration"><TextInput id="custom-duration" type="number" min={5} max={120} value={customDuration} onChange={(event) => setCustomDuration(Math.min(120, Math.max(5, Number(event.target.value))))} /></Field>}
          {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
          <Button type="submit" className="w-full">Fokus beginnen</Button>
        </Card>
      </form>

      <button type="button" className="action-link" onClick={() => setHelperOpen(true)}><span><span className="eyebrow block">Wenn der Anfang hängt</span><strong className="mt-1 block">Ich komme nicht rein</strong></span><span aria-hidden="true">→</span></button>

      <section aria-labelledby="focus-history">
        <div className="section-heading"><div><p className="eyebrow">Verlauf</p><h2 id="focus-history">Letzte Fokusblöcke</h2></div></div>
        <Card className="divide-y divide-[var(--border)] p-0">
          {state.focusSessions.filter((session) => session.status === "completed").slice(-5).reverse().map((session) => (
            <div key={session.id} className="flex items-center justify-between gap-4 px-5 py-4"><div className="min-w-0"><p className="truncate font-medium">{session.task}</p><p className="mt-1 text-sm text-[var(--text-muted)]">{new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "short" }).format(new Date(session.startedAt))} · {session.result === "yes" ? "Erreicht" : session.result === "partly" ? "Teilweise" : "Offen"}</p></div><span className="shrink-0 text-sm tabular-nums text-[var(--text-muted)]">{session.durationMinutes} Min</span></div>
          ))}
          {!state.focusSessions.some((session) => session.status === "completed") && <p className="px-5 py-7 text-sm text-[var(--text-muted)]">Noch kein Fokusblock. Beginne für zehn Minuten.</p>}
        </Card>
      </section>

      {helperOpen && <StartHelper initialTask={helperTask} onClose={() => setHelperOpen(false)} />}
    </div>
  );
}

export default function FocusPage() {
  return <Suspense fallback={<p className="p-6 text-sm text-[var(--text-muted)]">Fokus wird vorbereitet.</p>}><FocusHome /></Suspense>;
}
