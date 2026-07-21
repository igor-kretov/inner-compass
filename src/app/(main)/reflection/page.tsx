"use client";

import { useState, type FormEvent } from "react";
import { IdentityCompass } from "@/components/identity/identity-compass";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field, TextArea, TextInput } from "@/components/ui/form";
import { localDateKey, useAppStore, type PatternEntry } from "@/lib/app-store";

const reviewQuestions = [
  "Welche zwei oder drei Momente zeigen, wie du bereits handeln willst?",
  "Wo zog dich der alte Autopilot zurück – und wie bist du wiedergekehrt?",
  "Welche Aufgabe habe ich größer gemacht, als sie war?",
  "Wann hat mir Struktur geholfen?",
  "Wo bin ich in Hyperfokus oder Gedankenschleifen verschwunden?",
  "Was hat meinem Körper gutgetan?",
  "Was war emotional präsent, ohne dass ich es dramatisieren muss?",
  "Was ist das wichtigste Ergebnis der kommenden Woche?",
  "Welche drei konkreten Ergebnisse unterstützen es?",
  "Was lasse ich in der kommenden Woche bewusst weg?",
];

function weekKey(date = new Date()) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  return localDateKey(copy);
}

function WeeklyReviewFlow({ onClose }: { onClose: () => void }) {
  const { state, saveWeeklyReview } = useAppStore();
  const existing = state.weeklyReviews.find((review) => review.weekKey === weekKey());
  const [question, setQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>(() => existing?.answers ?? Array(10).fill(""));
  const [summary, setSummary] = useState(question >= 10);
  const [weeklyGoal, setWeeklyGoal] = useState(existing?.weeklyGoal ?? "");
  const [outcomes, setOutcomes] = useState<string[]>(existing?.outcomes ?? ["", "", ""]);
  const [movement, setMovement] = useState(existing?.movement ?? "");
  const [meditationIntention, setMeditationIntention] = useState(existing?.meditationIntention ?? "");
  const [omit, setOmit] = useState(existing?.omit ?? "");
  const [error, setError] = useState("");

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!weeklyGoal.trim()) { setError("Ein wichtigstes Wochenziel richtet die Wochenkarte aus."); return; }
    saveWeeklyReview({
      weekKey: weekKey(),
      answers,
      weeklyGoal: weeklyGoal.trim(),
      outcomes: outcomes.map((item) => item.trim()).filter(Boolean).slice(0, 3),
      movement: movement.trim(),
      meditationIntention: meditationIntention.trim(),
      omit: omit.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[var(--background)] px-5 py-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <div><p className="eyebrow">Wochenreview</p><p className="mt-1 text-sm text-[var(--text-muted)]">Nicht bewerten. Erkennen, entscheiden, ausrichten.</p></div>
          <Button variant="ghost" size="sm" onClick={onClose}>Schließen</Button>
        </header>
        {!summary ? (
          <>
            <div className="flex flex-1 flex-col justify-center py-10">
              <p className="eyebrow">Frage {question + 1} von {reviewQuestions.length}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{reviewQuestions[question]}</h1>
              <Field className="mt-8" label="Deine Beobachtung · optional" htmlFor="review-answer"><TextArea id="review-answer" autoFocus rows={6} value={answers[question] ?? ""} onChange={(event) => setAnswers((current) => current.map((answer, index) => index === question ? event.target.value : answer))} maxLength={800} /></Field>
            </div>
            <footer className="flex gap-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              {question > 0 && <Button variant="ghost" onClick={() => setQuestion(question - 1)}>Zurück</Button>}
              <Button variant="secondary" className="ml-auto" onClick={() => question === 9 ? setSummary(true) : setQuestion(question + 1)}>Überspringen</Button>
              <Button onClick={() => question === 9 ? setSummary(true) : setQuestion(question + 1)}>Weiter</Button>
            </footer>
          </>
        ) : (
          <form onSubmit={save} className="grid flex-1 content-center gap-6 py-10">
            <header><p className="eyebrow">Wochenkarte</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Richte die kommende Woche aus.</h1></header>
            <Card className="grid gap-5">
              <Field label="Wichtigstes Ergebnis der Woche" htmlFor="weekly-goal" error={error}><TextArea id="weekly-goal" rows={2} value={weeklyGoal} onChange={(event) => { setWeeklyGoal(event.target.value); setError(""); }} maxLength={240} /></Field>
              <div className="grid gap-3"><p className="text-sm font-medium">Drei konkrete Ergebnisse</p>{outcomes.map((outcome, index) => <TextInput key={index} aria-label={`Konkretes Ergebnis ${index + 1}`} value={outcome} onChange={(event) => setOutcomes((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} maxLength={180} placeholder={`${index + 1}. Ergebnis`} />)}</div>
              <Field label="Training oder Bewegung" htmlFor="weekly-movement"><TextInput id="weekly-movement" value={movement} onChange={(event) => setMovement(event.target.value)} maxLength={180} placeholder="Zum Beispiel: 2× Training, 2× Spaziergang" /></Field>
              <Field label="Meditationsintention" htmlFor="weekly-meditation"><TextInput id="weekly-meditation" value={meditationIntention} onChange={(event) => setMeditationIntention(event.target.value)} maxLength={180} /></Field>
              <Field label="Was lasse ich bewusst weg?" htmlFor="weekly-omit"><TextInput id="weekly-omit" value={omit} onChange={(event) => setOmit(event.target.value)} maxLength={180} /></Field>
            </Card>
            <div className="flex gap-3"><Button type="button" variant="ghost" onClick={() => { setSummary(false); setQuestion(9); }}>Zurück</Button><Button type="submit" className="ml-auto">Wochenkarte speichern</Button></div>
          </form>
        )}
      </div>
    </div>
  );
}

const triggers = ["Arbeit", "Beziehung", "Eifersucht", "Leistungsdruck", "Einsamkeit", "Müdigkeit", "Konsum", "Soziale Situation", "Unordnung", "Unbekannt", "Eigener Trigger"];
const bodyStates = ["Angespannt", "Unruhig", "Erschöpft", "Aktiviert", "Ruhig", "Schwer", "Neutral"];
const actions = ["Weitergedacht", "Gespräch gesucht", "Aufgabe begonnen", "Meditiert", "Trainiert", "Spazieren gegangen", "Konsumiert", "Geschlafen", "Bewusst losgelassen", "Andere"];

function PatternForm({ onDone }: { onDone: () => void }) {
  const { savePattern } = useAppStore();
  const [trigger, setTrigger] = useState("");
  const [customTrigger, setCustomTrigger] = useState("");
  const [bodyState, setBodyState] = useState("");
  const [thought, setThought] = useState("");
  const [impulse, setImpulse] = useState("");
  const [action, setAction] = useState("");
  const [after, setAfter] = useState<PatternEntry["after"] | "">("");
  const [error, setError] = useState("");

  const save = (event: FormEvent) => {
    event.preventDefault();
    const finalTrigger = trigger === "Eigener Trigger" ? customTrigger.trim() : trigger;
    if (!finalTrigger || !bodyState || !action || !after) { setError("Wähle Trigger, Körperzustand, Handlung und Zustand danach."); return; }
    savePattern({ trigger: finalTrigger, bodyState, thought: thought.trim() || undefined, impulse: impulse.trim() || undefined, action, after });
    onDone();
  };

  return (
    <form onSubmit={save} className="grid gap-5">
      <Card className="grid gap-6">
        <ChoiceChips label="Trigger" value={trigger} options={triggers.map((label) => ({ value: label, label }))} onChange={(value) => { setTrigger(value); setError(""); }} />
        {trigger === "Eigener Trigger" && <Field label="Eigener Trigger" htmlFor="custom-trigger"><TextInput id="custom-trigger" value={customTrigger} onChange={(event) => setCustomTrigger(event.target.value)} maxLength={100} /></Field>}
        <ChoiceChips label="Körperlicher Zustand" value={bodyState} options={bodyStates.map((label) => ({ value: label, label }))} onChange={setBodyState} />
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Dominanter Gedanke · optional" htmlFor="pattern-thought"><TextInput id="pattern-thought" value={thought} onChange={(event) => setThought(event.target.value)} maxLength={180} /></Field><Field label="Impuls · optional" htmlFor="pattern-impulse"><TextInput id="pattern-impulse" value={impulse} onChange={(event) => setImpulse(event.target.value)} maxLength={140} /></Field></div>
        <ChoiceChips label="Gewählte Handlung" value={action} options={actions.map((label) => ({ value: label, label }))} onChange={setAction} />
        <ChoiceChips label="Zustand danach" value={after} options={[{ value: "worse", label: "Schlechter" }, { value: "same", label: "Gleich" }, { value: "better", label: "Etwas besser" }, { value: "much-better", label: "Deutlich besser" }]} onChange={(value) => setAfter(value as PatternEntry["after"])} />
        {error && <p className="text-sm text-[var(--danger)]" role="alert">{error}</p>}
      </Card>
      <div className="flex gap-3"><Button type="button" variant="ghost" onClick={onDone}>Abbrechen</Button><Button type="submit" className="ml-auto">Eintrag speichern</Button></div>
    </form>
  );
}

function mostFrequent(values: string[]) {
  const counts = values.reduce<Record<string, number>>((acc, value) => ({ ...acc, [value]: (acc[value] ?? 0) + 1 }), {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
}

function PatternView() {
  const { state } = useAppStore();
  const entries = state.patternEntries;
  const body = mostFrequent(entries.map((entry) => entry.bodyState));
  const positiveEntries = entries.filter((entry) => entry.after === "better" || entry.after === "much-better");
  const positiveAction = mostFrequent(positiveEntries.map((entry) => entry.action));
  return (
    <div className="grid gap-4">
      {entries.length < 5 ? (
        <Card><p className="eyebrow">Noch {5 - entries.length} bis zur ersten Beobachtung</p><h3 className="mt-2 text-xl font-semibold">Noch zu wenig Einträge für eine belastbare Beobachtung.</h3><p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">Unter fünf relevanten Einträgen zeigt Inner Compass bewusst keine vermeintlichen Muster.</p></Card>
      ) : (
        <>
          <Card><p className="eyebrow">{entries.length < 10 ? "Vorsichtiger Hinweis" : "Häufigkeit"}</p><h3 className="mt-2 text-xl font-semibold">„{body?.[0]}“ trat in {body?.[1]} von {entries.length} Einträgen als Körperzustand auf.</h3></Card>
          {positiveAction && <Card><p className="eyebrow">Gemeinsames Auftreten</p><h3 className="mt-2 text-xl font-semibold">Nach „{positiveAction[0]}“ wurde der Zustand in {positiveAction[1]} Einträgen als besser notiert.</h3></Card>}
          <p className="text-sm leading-6 text-[var(--text-muted)]">Das trat in deinen Einträgen häufiger gemeinsam auf. Es beweist keine Ursache.</p>
        </>
      )}
      <Card className="divide-y divide-[var(--border)] p-0">
        {entries.slice(-8).reverse().map((entry) => <div key={entry.id} className="px-5 py-4"><div className="flex items-center justify-between gap-4"><strong>{entry.trigger}</strong><time className="text-xs text-[var(--text-muted)]">{new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(entry.createdAt))}</time></div><p className="mt-1 text-sm text-[var(--text-muted)]">{entry.bodyState} · {entry.action} · {entry.after === "much-better" ? "deutlich besser" : entry.after === "better" ? "etwas besser" : entry.after === "worse" ? "schlechter" : "gleich"}</p></div>)}
        {!entries.length && <p className="px-5 py-7 text-sm text-[var(--text-muted)]">Noch keine freiwilligen Mustereinträge.</p>}
      </Card>
    </div>
  );
}

function WeekOverview() {
  const { state } = useAppStore();
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 6);
  const plans = state.plans.filter((plan) => new Date(`${plan.date}T12:00:00`) >= start);
  const focus = state.focusSessions.filter((session) => new Date(session.startedAt) >= start && session.status === "completed");
  const meditations = state.meditationSessions.filter((session) => new Date(session.startedAt) >= start && session.status === "completed");
  const resets = state.resetSessions.filter((session) => new Date(session.createdAt) >= start);
  const reviews = state.weeklyReviews.filter((review) => new Date(review.createdAt) >= start);
  const physical = plans.filter((plan) => plan.bodyCompleted).length;
  const mainTaskIds = new Set(plans.map((plan) => plan.mainTask.id));
  const activeMinutes = <T extends { startedAt: string; endedAt?: string; updatedAt: string; totalPausedMs: number; durationMinutes: number }>(session: T) => {
    const elapsed = new Date(session.endedAt ?? session.updatedAt).getTime() - new Date(session.startedAt).getTime() - session.totalPausedMs;
    return Math.max(0, Math.min(session.durationMinutes, elapsed / 60_000));
  };
  const focusMinutes = Math.round(focus.reduce((sum, session) => sum + activeMinutes(session), 0));
  const meditationMinutes = Math.round(meditations.reduce((sum, session) => sum + activeMinutes(session), 0));
  const metrics = [
    ["Bewusst geplante Tage", plans.length],
    ["Hauptaufgaben begonnen", new Set(focus.map((session) => session.taskId).filter((id): id is string => Boolean(id && mainTaskIds.has(id)))).size],
    ["Hauptaufgaben abgeschlossen", plans.filter((plan) => plan.mainTask.completed).length],
    ["Fokusblöcke", focus.length],
    ["Fokuszeit", `${focusMinutes} Min`],
    ["Meditationstage", new Set(meditations.map((session) => localDateKey(new Date(session.startedAt)))).size],
    ["Meditationszeit", `${meditationMinutes} Min`],
    ["Bewegung", physical],
    ["Resets", resets.length],
    ["Wochenreviews", reviews.length],
  ];
  return (
    <div className="grid gap-5">
      <Card className="border-[var(--accent-border)] bg-[var(--accent-soft)]"><p className="eyebrow">Kontinuität</p><h3 className="mt-2 text-2xl font-semibold">In {plans.length} der letzten sieben Tage hast du deinen Tag bewusst geplant.</h3><p className="mt-3 text-sm text-[var(--text-muted)]">Keine Streak. Nur ein ehrlicher Blick auf die Woche.</p></Card>
      <div className="grid grid-cols-2 gap-3">{metrics.map(([label, value]) => <Card key={label} className="min-h-28"><p className="text-2xl font-semibold tabular-nums">{value}</p><p className="mt-2 text-sm leading-5 text-[var(--text-muted)]">{label}</p></Card>)}</div>
      <section><div className="section-heading"><div><p className="eyebrow">Tagesabschlüsse</p><h2>Letzte Notizen</h2></div></div><Card className="divide-y divide-[var(--border)] p-0">{state.plans.filter((plan) => plan.reflection).slice(-5).reverse().map((plan) => <div className="px-5 py-4" key={plan.id}><time className="text-xs text-[var(--text-muted)]">{new Intl.DateTimeFormat("de-CH", { day: "numeric", month: "long" }).format(new Date(`${plan.date}T12:00:00`))}</time><p className="mt-2">{plan.reflection?.important || plan.reflection?.note || "Bewusst abgeschlossen."}</p></div>)}{!state.plans.some((plan) => plan.reflection) && <p className="px-5 py-7 text-sm text-[var(--text-muted)]">Noch kein Tagesabschluss. Er bleibt freiwillig.</p>}</Card></section>
    </div>
  );
}

export default function ReflectionPage() {
  const { state } = useAppStore();
  const [tab, setTab] = useState<"week" | "identity" | "patterns" | "overview">("week");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [patternFormOpen, setPatternFormOpen] = useState(false);
  const latestReview = [...state.weeklyReviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return (
    <div className="page-stack">
      <header className="page-header"><p className="eyebrow">Reflexion</p><h1>Erkennen. Entscheiden. Ausrichten.</h1><p>Kurze Rückblicke, die wieder in Handlung führen.</p></header>
      <nav className="segmented-tabs four-tabs" aria-label="Reflexionsbereiche">{([['week', 'Wochenreview'], ['identity', 'Identität'], ['patterns', 'Muster'], ['overview', 'Diese Woche']] as const).map(([value, label]) => <button key={value} type="button" aria-current={tab === value ? "page" : undefined} onClick={() => setTab(value)}>{label}</button>)}</nav>
      {tab === "week" && <div className="grid gap-5"><Card className="border-[var(--accent-border)] bg-[var(--accent-soft)]"><p className="eyebrow">Etwa zehn Minuten</p><h2 className="mt-2 text-2xl font-semibold">Nicht bewerten. Erkennen, entscheiden, ausrichten.</h2><p className="mt-3 max-w-xl leading-7 text-[var(--text-muted)]">Ein ehrlicher Wochenblick ohne Leistungsnote. Jede Frage darf übersprungen werden.</p><Button className="mt-6" onClick={() => setReviewOpen(true)}>{state.weeklyReviews.some((review) => review.weekKey === weekKey()) ? "Diese Woche bearbeiten" : "Wochenreview beginnen"}</Button></Card>{latestReview && <Card><p className="eyebrow">Aktuelle Wochenkarte</p><h3 className="mt-2 text-2xl font-semibold">{latestReview.weeklyGoal}</h3>{latestReview.outcomes.length > 0 && <ol className="mt-5 grid gap-2 text-sm text-[var(--text-muted)]">{latestReview.outcomes.map((outcome, index) => <li key={outcome}><span className="mr-2 text-[var(--accent)]">{index + 1}.</span>{outcome}</li>)}</ol>}<div className="mt-5 grid gap-2 border-t border-[var(--border)] pt-5 text-sm text-[var(--text-muted)]">{latestReview.movement && <p><strong className="text-[var(--text)]">Körper:</strong> {latestReview.movement}</p>}{latestReview.meditationIntention && <p><strong className="text-[var(--text)]">Meditation:</strong> {latestReview.meditationIntention}</p>}{latestReview.omit && <p><strong className="text-[var(--text)]">Bewusst weglassen:</strong> {latestReview.omit}</p>}</div></Card>}</div>}
      {tab === "identity" && <IdentityCompass variant="full" />}
      {tab === "patterns" && <div className="grid gap-5">{patternFormOpen ? <PatternForm onDone={() => setPatternFormOpen(false)} /> : <><Button className="justify-self-start" onClick={() => setPatternFormOpen(true)}>Schnellen Eintrag erfassen</Button><PatternView /></>}</div>}
      {tab === "overview" && <WeekOverview />}
      {reviewOpen && <WeeklyReviewFlow onClose={() => setReviewOpen(false)} />}
    </div>
  );
}
