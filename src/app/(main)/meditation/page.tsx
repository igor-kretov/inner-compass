"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field, TextArea, TextInput } from "@/components/ui/form";
import { formatClock, remainingMilliseconds, useAppStore, type MeditationSession } from "@/lib/app-store";

type WakeLockSentinelLike = { release: () => Promise<void> };

function playMeditationTone(enabled: boolean) {
  if (!enabled) return;
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 392;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, context.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.6);
  } catch {
    // Audio feedback is optional and may be blocked by browser policy.
  }
}

function ActiveMeditation({ session }: { session: MeditationSession }) {
  const { state, pauseMeditation, resumeMeditation, endMeditation } = useAppStore();
  const [remaining, setRemaining] = useState(() => remainingMilliseconds(session));

  useEffect(() => {
    let lock: WakeLockSentinelLike | undefined;
    const navigatorWithWakeLock = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
    };
    navigatorWithWakeLock.wakeLock?.request("screen").then((value) => { lock = value; }).catch(() => undefined);
    return () => { lock?.release().catch(() => undefined); };
  }, []);

  useEffect(() => {
    const refresh = () => {
      const next = remainingMilliseconds(session);
      setRemaining(next);
      if (next === 0 && session.status === "running") {
        playMeditationTone(state.settings.sounds);
        if (state.settings.haptics && "vibrate" in navigator) navigator.vibrate?.(120);
        endMeditation(session.id);
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 500);
    return () => window.clearInterval(timer);
  }, [endMeditation, session, state.settings.haptics, state.settings.sounds]);

  return (
    <div className="fixed inset-0 z-[100] flex min-h-dvh flex-col bg-[var(--background)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <span className="eyebrow">Meditation</span>
        <Button variant="ghost" size="sm" onClick={() => endMeditation(session.id)}>Beenden</Button>
      </header>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center text-center">
        {session.focus && <p className="text-sm text-[var(--text-muted)]">{session.focus}</p>}
        <div className="my-10 font-mono text-[clamp(4rem,18vw,8rem)] font-medium leading-none tracking-[-0.08em] tabular-nums" role="timer" aria-label={`${Math.ceil(remaining / 60_000)} Minuten verbleibend`}>
          {formatClock(remaining)}
        </div>
        {session.status === "paused" ? <Button onClick={() => resumeMeditation(session.id)}>Fortsetzen</Button> : <Button variant="secondary" onClick={() => pauseMeditation(session.id)}>Pause</Button>}
        <p className="sr-only" aria-live="polite">{session.status === "paused" ? "Meditation pausiert" : "Meditation läuft"}</p>
      </div>
    </div>
  );
}

function MeditationReview({ session }: { session: MeditationSession }) {
  const { completeMeditation } = useAppStore();
  const router = useRouter();
  const [presence, setPresence] = useState<MeditationSession["presence"]>();
  const [note, setNote] = useState("");

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!presence) return;
    completeMeditation(session.id, presence, note.trim() || undefined);
    router.push("/today");
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[var(--background)] px-5 py-[max(2rem,env(safe-area-inset-top))]">
      <form className="mx-auto grid min-h-full w-full max-w-xl content-center gap-7" onSubmit={save}>
        <header><p className="eyebrow">Meditation beendet</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Du musst nichts Besonderes erlebt haben.</h1></header>
        <Card className="grid gap-6">
          <ChoiceChips label="Bist du jetzt präsenter als davor?" value={presence} options={[
            { value: "yes", label: "Ja" }, { value: "somewhat", label: "Etwas" }, { value: "no", label: "Nein" }, { value: "skip", label: "Nicht bewerten" },
          ]} onChange={(value) => setPresence(value as MeditationSession["presence"])} />
          <Field label="Kurze Notiz · optional" htmlFor="meditation-note"><TextArea id="meditation-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} /></Field>
        </Card>
        <Button type="submit" disabled={!presence}>Speichern und zurück</Button>
      </form>
    </div>
  );
}

export default function MeditationPage() {
  const { state, todayPlan, activeMeditation, startMeditation } = useAppStore();
  const [duration, setDuration] = useState(String(todayPlan?.meditationMinutes ?? 10));
  const [custom, setCustom] = useState(15);
  const [focus, setFocus] = useState("");

  if (activeMeditation?.status === "running" || activeMeditation?.status === "paused") return <ActiveMeditation session={activeMeditation} />;
  if (activeMeditation?.status === "review") return <MeditationReview session={activeMeditation} />;

  return (
    <div className="page-stack">
      <header className="page-header"><p className="eyebrow">Meditation</p><h1>Still werden. Nichts leisten.</h1><p>Wähle eine Dauer und, wenn hilfreich, einen sanften Fokus.</p></header>
      <Card className="grid gap-7">
        <ChoiceChips label="Dauer" value={duration} options={[
          { value: "5", label: "5 Min" }, { value: "10", label: "10 Min" }, { value: "20", label: "20 Min" }, { value: "custom", label: "Eigene" },
        ]} onChange={setDuration} />
        {duration === "custom" && <Field label="Eigene Dauer · bis 60 Minuten" htmlFor="meditation-duration"><TextInput id="meditation-duration" type="number" min={1} max={60} value={custom} onChange={(event) => setCustom(Math.min(60, Math.max(1, Number(event.target.value))))} /></Field>}
        <ChoiceChips label="Optionaler Fokus" value={focus} options={["Atem", "Körper", "Geräusche", "Gedanken beobachten", "Offene Präsenz"].map((label) => ({ value: label, label }))} onChange={setFocus} />
        <Button className="w-full" onClick={() => {
          playMeditationTone(state.settings.sounds);
          startMeditation(duration === "custom" ? custom : Number(duration), focus || undefined);
        }}>Meditation beginnen</Button>
      </Card>
      <p className="text-center text-sm leading-6 text-[var(--text-muted)]">Der Bildschirm bleibt, soweit der Browser es zulässt, während der Meditation aktiv.</p>
    </div>
  );
}
