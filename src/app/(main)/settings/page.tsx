"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChoiceChips } from "@/components/ui/choice-chips";
import { Field, TextInput } from "@/components/ui/form";
import { useAppStore, type AppSettings, type AppState } from "@/lib/app-store";

const anchorOptions = ["Körper", "Arbeit", "Ruhe", "Beziehungen", "Mut", "Ordnung", "Kreativität", "Spiritualität"];

type Preview = { state: AppState; counts: Record<string, number>; exportedAt?: string };

export default function SettingsPage() {
  const {
    state,
    storageFallback,
    updateSettings,
    restartOnboarding,
    exportJson,
    previewImport,
    applyImport,
    clearAll,
  } = useAppStore();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<AppSettings>(() => ({ ...state.settings }));
  const [saved, setSaved] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [importMode, setImportMode] = useState<"replace" | "merge">("merge");
  const [importError, setImportError] = useState("");
  const [importDone, setImportDone] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [cleared, setCleared] = useState(false);

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (draft.emergencyName.trim() && !draft.emergencyPhone.trim()) {
      setSettingsError("Ergänze eine Telefonnummer oder entferne den Namen des Notfallkontakts.");
      document.getElementById("emergency-phone")?.focus();
      return;
    }
    setSettingsError("");
    updateSettings(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const toggleAnchor = (anchor: string) => {
    const selected = draft.anchors.includes(anchor);
    if (!selected && draft.anchors.length >= 3) return;
    setDraft({ ...draft, anchors: selected ? draft.anchors.filter((item) => item !== anchor) : [...draft.anchors, anchor] });
  };

  const downloadExport = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inner-compass-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const readImport = async (event: ChangeEvent<HTMLInputElement>) => {
    setImportError(""); setPreview(null); setImportDone(false);
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setImportError("Die Datei ist größer als 5 MB."); return; }
    try {
      setPreview(previewImport(await file.text()));
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Die Datei konnte nicht geprüft werden.");
    }
  };

  const confirmImport = () => {
    if (!preview) return;
    applyImport(preview, importMode);
    setPreview(null); setImportDone(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const confirmClear = async () => {
    if (deleteText !== "LÖSCHEN") return;
    await clearAll();
    setDeleteOpen(false); setDeleteText(""); setCleared(true);
    router.push("/onboarding");
  };

  return (
    <div className="page-stack">
      <header className="page-header"><p className="eyebrow">Einstellungen</p><h1>Dein System, ruhig angepasst.</h1><p>Alle persönlichen Daten bleiben lokal auf diesem Gerät.</p></header>

      {storageFallback && <Card className="border-[var(--warning-border)] bg-[var(--warning-soft)]"><p className="font-medium">Eingeschränkter Speichermodus</p><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">IndexedDB ist in diesem Browser nicht verfügbar. Inner Compass nutzt einen eingeschränkten lokalen Ersatzspeicher. Exportiere wichtige Daten vorsichtshalber regelmäßig.</p></Card>}

      <form onSubmit={save} className="grid gap-6">
        <section aria-labelledby="personal-settings"><div className="section-heading"><div><p className="eyebrow">Persönlich</p><h2 id="personal-settings">Anrede und Rhythmus</h2></div></div><Card className="grid gap-5">
          <Field label="Name oder Anrede · optional" htmlFor="settings-name"><TextInput id="settings-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} maxLength={80} autoComplete="nickname" /></Field>
          <div className="grid grid-cols-2 gap-4"><Field label="Tagesbeginn" htmlFor="settings-day-start"><TextInput id="settings-day-start" type="time" value={draft.dayStart} onChange={(event) => setDraft({ ...draft, dayStart: event.target.value })} /></Field><Field label="Meditation" htmlFor="settings-meditation-time"><TextInput id="settings-meditation-time" type="time" value={draft.meditationTime} onChange={(event) => setDraft({ ...draft, meditationTime: event.target.value })} /></Field><Field label="Training" htmlFor="settings-training-time"><TextInput id="settings-training-time" type="time" value={draft.trainingTime} onChange={(event) => setDraft({ ...draft, trainingTime: event.target.value })} /></Field><Field label="Review-Uhrzeit" htmlFor="settings-review-time"><TextInput id="settings-review-time" type="time" value={draft.reviewTime} onChange={(event) => setDraft({ ...draft, reviewTime: event.target.value })} /></Field></div>
          <Field label="Wochenreview-Tag" htmlFor="settings-review-day"><select id="settings-review-day" className="control" value={draft.reviewDay} onChange={(event) => setDraft({ ...draft, reviewDay: event.target.value })}>{["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"].map((day, index) => <option key={day} value={index}>{day}</option>)}</select></Field>
          <ChoiceChips label="Standard-Fokusdauer" value={String(draft.focusDuration)} options={[25, 50, 90].map((minutes) => ({ value: String(minutes), label: `${minutes} Min` }))} onChange={(value) => setDraft({ ...draft, focusDuration: Number(value) as 25 | 50 | 90 })} />
        </Card></section>

        <section aria-labelledby="appearance-settings"><div className="section-heading"><div><p className="eyebrow">Darstellung</p><h2 id="appearance-settings">Ruhig und zugänglich</h2></div></div><Card className="grid gap-6">
          <ChoiceChips label="Farbmodus" value={draft.theme} options={[{ value: "system", label: "System" }, { value: "light", label: "Hell" }, { value: "dark", label: "Dunkel" }]} onChange={(value) => setDraft({ ...draft, theme: value as AppSettings["theme"] })} />
          <div><p className="text-sm font-medium">Persönliche Lebensanker · bis zu drei</p><div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Lebensanker">{anchorOptions.map((anchor) => { const selected = draft.anchors.includes(anchor); return <button type="button" key={anchor} className="chip" aria-pressed={selected} disabled={!selected && draft.anchors.length >= 3} onClick={() => toggleAnchor(anchor)}>{anchor}</button>; })}</div></div>
          <label className="setting-toggle"><span><strong>Start- und Endton</strong><small>Dezenter Ton bei Timern</small></span><input type="checkbox" checked={draft.sounds} onChange={(event) => setDraft({ ...draft, sounds: event.target.checked })} /></label>
          <label className="setting-toggle"><span><strong>Haptisches Feedback</strong><small>Nur soweit der Browser es unterstützt</small></span><input type="checkbox" checked={draft.haptics} onChange={(event) => setDraft({ ...draft, haptics: event.target.checked })} /></label>
        </Card></section>

        <section aria-labelledby="safety-settings"><div className="section-heading"><div><p className="eyebrow">Sicherheit</p><h2 id="safety-settings">Persönlicher Notfallkontakt</h2></div></div><Card className="grid gap-5"><p className="text-sm leading-6 text-[var(--text-muted)]">Optional. Wird nur lokal gespeichert und in der statischen Krisenmeldung als direkter Anruf angeboten.</p><div className="grid gap-4 sm:grid-cols-2"><Field label="Name" htmlFor="emergency-name"><TextInput id="emergency-name" value={draft.emergencyName} onChange={(event) => { setDraft({ ...draft, emergencyName: event.target.value }); setSettingsError(""); }} maxLength={100} autoComplete="name" /></Field><Field label="Telefon" htmlFor="emergency-phone" error={settingsError}><TextInput id="emergency-phone" type="tel" value={draft.emergencyPhone} onChange={(event) => { setDraft({ ...draft, emergencyPhone: event.target.value }); setSettingsError(""); }} maxLength={40} autoComplete="tel" /></Field></div></Card></section>

        <div className="flex justify-end"><Button type="submit">{saved ? "Gespeichert" : "Einstellungen speichern"}</Button></div>
      </form>

      <section aria-labelledby="data-settings"><div className="section-heading"><div><p className="eyebrow">Datenkontrolle</p><h2 id="data-settings">Export, Import und Löschen</h2></div></div><div className="grid gap-4">
        <Card><h3 className="text-lg font-semibold">Lesbare Sicherung</h3><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Exportiert alle Inner-Compass-Daten als versionierte JSON-Datei. Keine Browser- oder Gerätedaten werden ergänzt.</p><Button className="mt-5" variant="secondary" onClick={downloadExport}>Daten exportieren</Button></Card>
        <Card><h3 className="text-lg font-semibold">Sicherung importieren</h3><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Dateien werden lokal geprüft. Maximal 5 MB.</p><Field className="mt-5" label="Inner-Compass-JSON-Datei" htmlFor="data-import"><input ref={fileRef} id="data-import" type="file" accept="application/json,.json" onChange={readImport} className="block w-full text-sm file:mr-4 file:min-h-11 file:rounded-xl file:border-0 file:bg-[var(--surface-muted)] file:px-4 file:font-medium file:text-[var(--text)]" /></Field>{importError && <p className="mt-4 text-sm text-[var(--danger)]" role="alert">{importError}</p>}{importDone && <p className="mt-4 text-sm text-[var(--success)]" role="status">Import abgeschlossen.</p>}
          {preview && <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4"><p className="font-medium">Importvorschau</p>{preview.exportedAt && <p className="mt-1 text-xs text-[var(--text-muted)]">Exportiert am {new Intl.DateTimeFormat("de-CH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(preview.exportedAt))}</p>}<dl className="mt-4 grid grid-cols-2 gap-3 text-sm">{Object.entries(preview.counts).map(([key, count]) => <div key={key}><dt className="text-[var(--text-muted)]">{({ plans: "Tagespläne", focusSessions: "Fokusblöcke", meditationSessions: "Meditationen", resetSessions: "Resets", weeklyReviews: "Wochenreviews", patternEntries: "Mustereinträge", routines: "Routinen", routineInstances: "Routine-Tage", weekPlans: "Wochenpläne" } as Record<string, string>)[key] ?? key}</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{count}</dd></div>)}</dl><ChoiceChips className="mt-5" label="Importmodus" value={importMode} options={[{ value: "merge", label: "Zusammenführen" }, { value: "replace", label: "Vorhandene ersetzen" }]} onChange={(value) => setImportMode(value as typeof importMode)} /><Button className="mt-5" onClick={confirmImport}>Import bestätigen</Button></div>}
        </Card>
        <Card className="border-[var(--danger-border)]"><h3 className="text-lg font-semibold">Alle Daten löschen</h3><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">Entfernt Tages- und Wochenpläne, Routinen, Sitzungen, Reflexionen und Einstellungen dauerhaft von diesem Gerät.</p><Button className="mt-5" variant="danger" onClick={() => setDeleteOpen(true)}>Löschen vorbereiten</Button>{cleared && <p className="mt-3 text-sm">Alle Daten wurden entfernt.</p>}</Card>
      </div></section>

      <section aria-labelledby="about-settings"><div className="section-heading"><div><p className="eyebrow">Über die App</p><h2 id="about-settings">Klarheit über Grenzen</h2></div></div><Card className="divide-y divide-[var(--border)] p-0"><details className="group px-5 py-4"><summary className="cursor-pointer font-medium">Datenschutzinformation</summary><p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">Version 1 arbeitet local-first. Es gibt kein Konto, keine Werbung, keine Analytics und keine Übertragung persönlicher Einträge an einen Server. Eine exportierte Datei liegt außerhalb der Kontrolle der App und sollte sicher aufbewahrt werden.</p></details><details className="group px-5 py-4"><summary className="cursor-pointer font-medium">Medizinischer Hinweis</summary><p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">Inner Compass ist keine medizinische Anwendung, stellt keine Diagnose und ersetzt keine Psychotherapie, ärztliche Behandlung oder Hilfe in einer akuten Krise.</p></details><div className="flex items-center justify-between px-5 py-4"><span><strong className="block">Onboarding</strong><small className="text-[var(--text-muted)]">Einführung erneut anzeigen</small></span><Button variant="ghost" size="sm" onClick={() => { restartOnboarding(); router.push("/onboarding"); }}>Neu starten</Button></div><div className="flex items-center justify-between px-5 py-4 text-sm"><span className="text-[var(--text-muted)]">App-Version</span><span className="font-mono">0.1.0</span></div></Card></section>

      {deleteOpen && <div className="fixed inset-0 z-[100] grid place-items-end bg-black/45 p-3 sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="delete-title"><Card className="w-full max-w-md shadow-2xl"><p className="eyebrow text-[var(--danger)]">Doppelte Bestätigung</p><h2 id="delete-title" className="mt-2 text-2xl font-semibold">Alle lokalen Daten dauerhaft löschen?</h2><p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">Exportiere vorher eine Sicherung, wenn du die Daten behalten möchtest. Gib <strong className="text-[var(--text)]">LÖSCHEN</strong> ein.</p><Field className="mt-5" label="Bestätigung" htmlFor="delete-confirm"><TextInput id="delete-confirm" autoFocus value={deleteText} onChange={(event) => setDeleteText(event.target.value)} autoComplete="off" /></Field><div className="mt-6 flex justify-end gap-3"><Button variant="ghost" onClick={() => { setDeleteOpen(false); setDeleteText(""); }}>Abbrechen</Button><Button variant="danger" disabled={deleteText !== "LÖSCHEN"} onClick={confirmClear}>Endgültig löschen</Button></div></Card></div>}
    </div>
  );
}
