"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field, TextArea, TextInput } from "@/components/ui/form";
import { localDateKey, newId, useAppStore } from "@/lib/app-store";

// Deliberately small, explicit and local. Keyword matching is incomplete and must
// never be interpreted as a diagnosis or a professional risk assessment.
const crisisPhrases = [
  "ich will mich umbringen",
  "ich bringe mich um",
  "ich werde mich umbringen",
  "ich will nicht mehr leben",
  "ich möchte nicht mehr leben",
  "ich will mir das leben nehmen",
  "ich werde mir etwas antun",
  "i want to kill myself",
  "i am going to kill myself",
  "i want to end my life",
];

export function containsCrisisPhrase(text: string) {
  const normalized = text.toLocaleLowerCase("de-CH").replace(/[.!?,;:]/g, " ").replace(/\s+/g, " ").trim();
  return crisisPhrases.some((phrase) => normalized.includes(phrase));
}

const bodyOptions = [
  { value: "10 ruhige Atemzüge", seconds: 60 },
  { value: "2 Minuten gehen", seconds: 120 },
  { value: "20 Kniebeugen" },
  { value: "Wasser trinken" },
  { value: "Gesicht mit kaltem Wasser waschen" },
  { value: "Schultern und Kiefer entspannen", seconds: 60 },
  { value: "60 Sekunden den Raum beobachten", seconds: 60 },
];

function BodyTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    const timer = window.setInterval(() => setRemaining((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [remaining, running]);

  useEffect(() => {
    if (running && remaining === 0) onDone();
  }, [onDone, remaining, running]);

  return (
    <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-5 text-center">
      <div className="font-mono text-4xl tabular-nums" role="timer" aria-live="polite">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</div>
      {remaining > 0 ? <Button className="mt-4" variant="secondary" onClick={() => setRunning(!running)}>{running ? "Pausieren" : remaining === seconds ? "Timer starten" : "Fortsetzen"}</Button> : <p className="mt-3 text-sm text-[var(--text-muted)]">Genug. Spüre kurz nach.</p>}
    </div>
  );
}

export default function ResetPage() {
  const { state, todayPlan, saveReset, savePlan, updatePlan } = useAppStore();
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [thought, setThought] = useState("");
  const [kind, setKind] = useState("");
  const [actionNeeded, setActionNeeded] = useState<"yes" | "no" | "unclear" | "">("");
  const [responsibleAction, setResponsibleAction] = useState("");
  const [createTask, setCreateTask] = useState(false);
  const [later, setLater] = useState("");
  const [missingInformation, setMissingInformation] = useState("");
  const [unclearDecision, setUnclearDecision] = useState("");
  const [bodyReset, setBodyReset] = useState("");
  const [timerDone, setTimerDone] = useState(false);
  const [returnTo, setReturnTo] = useState("");
  const [customReturn, setCustomReturn] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const crisisDetected = useMemo(() => containsCrisisPhrase(thought), [thought]);
  const selectedBody = bodyOptions.find((item) => item.value === bodyReset);
  const finalReturn = returnTo === "Eigener Eintrag" ? customReturn.trim() : returnTo;

  const canContinue = () => {
    if (step === 0) return thought.trim().length > 0 && !crisisDetected;
    if (step === 1) return Boolean(kind);
    if (step === 2) {
      if (!actionNeeded) return false;
      if (actionNeeded === "yes") return Boolean(responsibleAction.trim());
      if (actionNeeded === "no") return Boolean(later);
      return Boolean(missingInformation.trim() && unclearDecision);
    }
    if (step === 3) return Boolean(bodyReset) && (!selectedBody?.seconds || timerDone);
    return Boolean(finalReturn);
  };

  const next = () => {
    if (!canContinue()) { setError("Triff eine kurze Auswahl, um fortzufahren."); return; }
    setError("");
    if (step < 4) setStep(step + 1);
  };

  const finish = () => {
    let taskCreated = false;
    if (actionNeeded === "yes" && createTask && responsibleAction.trim()) {
      if (todayPlan && todayPlan.secondaryTasks.length < 2) {
        updatePlan((plan) => ({
          ...plan,
          secondaryTasks: [...plan.secondaryTasks, { id: newId(), title: responsibleAction.trim(), completed: false }],
        }));
        taskCreated = true;
      } else if (todayPlan && !todayPlan.courageousAction) {
        updatePlan((plan) => ({ ...plan, courageousAction: responsibleAction.trim() }));
        taskCreated = true;
      } else if (!todayPlan) {
        savePlan({
          date: localDateKey(),
          mainTask: { id: newId(), title: responsibleAction.trim(), completed: false },
          nextStep: responsibleAction.trim(),
          secondaryTasks: [],
          bodyCompleted: false,
          meditationSkipped: false,
          meditationCompleted: false,
          courageousCompleted: false,
        });
        taskCreated = true;
      }
    }
    saveReset({
      thought: thought.trim(),
      kind,
      actionNeeded: actionNeeded as "yes" | "no" | "unclear",
      responsibleAction: responsibleAction.trim() || undefined,
      later: later || undefined,
      missingInformation: missingInformation.trim() || undefined,
      unclearDecision: unclearDecision || undefined,
      bodyReset,
      returnTo: finalReturn,
      createdTask: taskCreated,
    });
    setSaved(true);
  };

  const resetFlow = () => {
    setStarted(false); setStep(0); setThought(""); setKind(""); setActionNeeded(""); setResponsibleAction(""); setCreateTask(false); setLater(""); setMissingInformation(""); setUnclearDecision(""); setBodyReset(""); setTimerDone(false); setReturnTo(""); setCustomReturn(""); setSaved(false); setError("");
  };

  if (!started) {
    return (
      <div className="page-stack">
        <header className="page-header"><p className="eyebrow">Reset</p><h1>Raus aus der Schleife.</h1><p>Keine weitere Analyse. Prüfe die Handlung, regulier den Körper, kehre zurück.</p></header>
        <Card className="relative overflow-hidden border-[var(--accent-border)] bg-[var(--accent-soft)] p-7 sm:p-9">
          <div className="absolute -right-12 -top-12 size-40 rounded-full border border-[var(--accent-border)]" aria-hidden="true" />
          <p className="eyebrow">Zwei bis vier Minuten</p>
          <h2 className="mt-3 max-w-md text-3xl font-semibold tracking-[-0.04em]">Ich bin im Kopf gefangen</h2>
          <p className="mt-4 max-w-md leading-7 text-[var(--text-muted)]">Ist gerade eine Entscheidung nötig – oder fordert der Gedanke nur erneut Aufmerksamkeit?</p>
          <Button className="mt-7" onClick={() => setStarted(true)}>Reset beginnen</Button>
        </Card>
        <Card><p className="text-sm text-[var(--text-muted)]">Bisher genutzt</p><p className="mt-2 text-3xl font-semibold tabular-nums">{state.resetSessions.length}</p><p className="mt-1 text-sm text-[var(--text-muted)]">ruhige Rückkehr{state.resetSessions.length === 1 ? "" : "en"}</p></Card>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="page-stack place-content-center py-16 text-center">
        <div className="mx-auto size-3 rounded-full bg-[var(--accent)] shadow-[0_0_0_8px_var(--accent-soft)]" />
        <h1 className="mt-8 text-3xl font-semibold tracking-[-0.04em]">Du musst den Gedanken nicht besiegen.</h1>
        <p className="mx-auto mt-4 max-w-md text-lg leading-8 text-[var(--text-muted)]">Du musst ihm nur nicht weiter folgen. Du kehrst jetzt zurück zu: <span className="font-medium text-[var(--text)]">{finalReturn}</span>.</p>
        <Button className="mx-auto mt-8" onClick={resetFlow}>Zurück ins Leben</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-7rem)] w-full max-w-2xl flex-col py-2">
      <header className="flex items-center justify-between gap-4">
        <div><p className="eyebrow">Reset · {step + 1} / 5</p><p className="mt-1 text-sm text-[var(--text-muted)]">Genug gedacht. Wohin kehrst du zurück?</p></div>
        <Button variant="ghost" size="sm" onClick={resetFlow}>Beenden</Button>
      </header>
      <div className="flex flex-1 flex-col justify-center py-10">
        {step === 0 && (
          <section><h1 className="text-3xl font-semibold tracking-[-0.04em]">Welcher Gedanke zieht dich gerade hinein?</h1><Field className="mt-7" label="Kurz benennen" htmlFor="reset-thought" hint={`${thought.length} / 300 Zeichen`}><TextArea id="reset-thought" autoFocus rows={5} value={thought} onChange={(event) => setThought(event.target.value)} maxLength={300} /></Field>
          {crisisDetected && <Card className="mt-5 border-[var(--danger-border)]" role="alert"><h2 className="text-lg font-semibold">Bitte hole dir jetzt direkte Unterstützung.</h2><p className="mt-3 leading-7 text-[var(--text-muted)]">Diese App kann dich in einer akuten Krise nicht ausreichend unterstützen. Wende dich jetzt an eine Person in deiner Nähe, eine medizinische Fachstelle oder den örtlichen Notruf.</p>{state.settings.emergencyPhone && <a className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-[var(--text)] px-5 font-medium text-[var(--background)]" href={`tel:${state.settings.emergencyPhone}`}>{state.settings.emergencyName ? `${state.settings.emergencyName} anrufen` : "Notfallkontakt anrufen"}</a>}<p className="mt-4 text-xs text-[var(--text-muted)]">Die lokale Stichworterkennung ist unvollständig und keine professionelle Risikobewertung.</p></Card>}</section>
        )}
        {step === 1 && <section><h1 className="text-3xl font-semibold tracking-[-0.04em]">Was ist das gerade am ehesten?</h1><ChoiceChips className="mt-7" label="Art des Vorgangs" value={kind} options={["Ein reales Problem", "Eine Entscheidung", "Eine Emotion", "Ein wiederkehrendes Szenario", "Ich weiß es nicht"].map((label) => ({ value: label, label }))} onChange={setKind} /></section>}
        {step === 2 && <section><h1 className="text-3xl font-semibold tracking-[-0.04em]">Ist in den nächsten 24 Stunden eine konkrete Handlung nötig?</h1><ChoiceChips className="mt-7" label="Handlungsprüfung" value={actionNeeded} options={[{ value: "yes", label: "Ja" }, { value: "no", label: "Nein" }, { value: "unclear", label: "Unklar" }]} onChange={(value) => setActionNeeded(value as typeof actionNeeded)} />
          {actionNeeded === "yes" && <Card className="mt-6 grid gap-5"><Field label="Was ist die kleinste verantwortliche Handlung?" htmlFor="responsible-action"><TextInput id="responsible-action" value={responsibleAction} onChange={(event) => setResponsibleAction(event.target.value)} maxLength={180} /></Field><label className="flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" className="size-5 accent-[var(--accent)]" checked={createTask} onChange={(event) => setCreateTask(event.target.checked)} />Als Tagesaufgabe übernehmen, wenn Platz ist</label></Card>}
          {actionNeeded === "no" && <Card className="mt-6"><h2 className="text-xl font-semibold">Dann musst du es jetzt nicht lösen.</h2><ChoiceChips className="mt-5" label="Später reflektieren?" value={later} options={["Heute Abend", "Morgen", "Im nächsten Wochenreview", "Nicht erneut einplanen"].map((label) => ({ value: label, label }))} onChange={setLater} /></Card>}
          {actionNeeded === "unclear" && <Card className="mt-6 grid gap-5"><Field label="Welche Information fehlt wirklich?" htmlFor="missing-info"><TextInput id="missing-info" value={missingInformation} onChange={(event) => setMissingInformation(event.target.value)} maxLength={180} /></Field><ChoiceChips label="Danach" value={unclearDecision} options={["Information beschaffen", "Entscheidung vertagen", "Thema loslassen"].map((label) => ({ value: label, label }))} onChange={setUnclearDecision} /></Card>}</section>}
        {step === 3 && <section><p className="eyebrow">Zurück in den Körper</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Wähle einen körperlichen Reset.</h1><ChoiceChips className="mt-7" label="Körperlicher Reset" value={bodyReset} options={bodyOptions.map((item) => ({ value: item.value, label: item.value }))} onChange={(value) => { setBodyReset(value); setTimerDone(!bodyOptions.find((item) => item.value === value)?.seconds); }} />{selectedBody?.seconds && <BodyTimer key={bodyReset} seconds={selectedBody.seconds} onDone={() => setTimerDone(true)} />}</section>}
        {step === 4 && <section><h1 className="text-3xl font-semibold tracking-[-0.04em]">Wohin kehrst du jetzt zurück?</h1><ChoiceChips className="mt-7" label="Rückkehrhandlung" value={returnTo} options={["Hauptaufgabe", "Nächste Tagesaufgabe", "Training", "Soziale Handlung", "Erholung", "Eigener Eintrag"].map((label) => ({ value: label, label }))} onChange={setReturnTo} />{returnTo === "Eigener Eintrag" && <Field className="mt-5" label="Wohin genau?" htmlFor="custom-return"><TextInput id="custom-return" value={customReturn} onChange={(event) => setCustomReturn(event.target.value)} maxLength={120} /></Field>}</section>}
        {error && <p className="mt-5 text-sm text-[var(--danger)]" role="alert">{error}</p>}
      </div>
      <footer className="flex gap-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">{step > 0 && <Button variant="ghost" onClick={() => { setStep(step - 1); setError(""); }}>Zurück</Button>}<Button className="ml-auto" onClick={step === 4 ? finish : next} disabled={crisisDetected}>{step === 4 ? "Zurück ins Leben" : "Weiter"}</Button></footer>
    </div>
  );
}
