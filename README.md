# Inner Compass

Inner Compass ist eine mobile-first Progressive Web App für Fokus, Tagesstruktur und mentale Präsenz. Sie übersetzt Gedanken in eine klare Priorität, einen sichtbaren nächsten Schritt und eine bewusste Rückkehr ins Handeln.

Die App ist **keine medizinische Anwendung**, stellt keine Diagnose und ersetzt weder Psychotherapie noch ärztliche oder akute professionelle Hilfe.

## Was der MVP umfasst

- kurzes Onboarding mit Tagesrhythmus, Fokusdauer, Lebensankern und Datenschutzhinweis
- Tagesplaner mit den Ansichten **Tag**, **Routinen** und **Woche**, einer klaren Hauptaufgabe sowie dynamisch ergänzbaren Aufgaben
- wiederverwendbare Routinen mit Wochentagen, Tagesabschnitt, optionaler Uhrzeit und einem bis sechs kleinen Schritten
- unabhängige Routine-Tagesinstanzen sowie Aufgabenstatus für erledigt, bewusst ausgelassen und auf den Folgetag verschoben
- schlanker Wochenplan mit einem Fokus, bis zu drei Ergebnissen, Aufgabenparkplatz und bewusster Tageszuordnung
- reload-fester Fokustimer, Starthelfer und ruhiger Hyperfokus-Hinweis
- kurzer Reset-Flow gegen Gedankenschleifen sowie eine lokale, konservative Krisenhinweis-Logik
- Meditationstimer, Tagesabschluss, Wochenreview und freiwilliges Musterprotokoll
- vorsichtige Musterhinweise erst bei ausreichender Datenmenge
- lokale Datenhaltung sowie versionierter JSON-Export und validierter Import
- Light-, Dark- und Systemmodus
- installierbare PWA mit App-Shell-Cache und ehrlichem Offline-Fallback

## Planer in Kürze

Der Bereich **Heute** enthält drei Tabs, ohne die Hauptnavigation zu vergrößern:

- **Tag** zeigt den gewählten Kalendertag, seinen Tageskern und die Abschnitte Morgen, Tag und Abend. Neben der Hauptaufgabe können weitere Aufgaben ergänzt und mit einer optionalen Uhrzeit einsortiert werden. Der technische Schutz des Datenmodells liegt bei 30 zusätzlichen Aufgaben pro Tagesplan.
- **Routinen** verwaltet wiederkehrende Vorlagen. Eine Routine gilt an mindestens einem gewählten Wochentag, gehört zu genau einem Tagesabschnitt und enthält ein bis sechs geordnete Schritte. Eine Uhrzeit ist ein weicher Startanker, keine Erinnerung.
- **Woche** hält einen optionalen Wochenfokus, bis zu drei sichtbare Ergebnisse und einen kleinen Aufgabenparkplatz bereit. Eine Parkplatz-Aufgabe erscheint erst dann im Tagesplan, wenn sie bewusst einem Tag zugeordnet wurde.

Für jeden passenden Kalendertag entsteht eine eigenständige Routine-Instanz. Spätere Änderungen an der Vorlage verändern deshalb keine bereits protokollierten Tage. Aufgaben und Routinen können neutral ausgelassen oder wieder geöffnet werden; Aufgaben lassen sich gezielt auf den nächsten Tag verschieben. Es gibt keine Streaks, verfallenden Serien oder Reminder im MVP.

## Voraussetzungen

- Node.js 20.9 oder neuer
- npm 10 oder neuer empfohlen
- ein aktueller Browser mit IndexedDB-Unterstützung

## Installation und Start

```bash
npm install
npm run dev
```

Danach ist die App normalerweise unter [http://localhost:3000](http://localhost:3000) erreichbar.

Ein Produktions-Build wird so geprüft und gestartet:

```bash
npm run build
npm run start
```

Der Service Worker wird nur im Produktionsmodus registriert. Das verhindert störende Alt-Caches während der Entwicklung.

## Qualitätsprüfungen

```bash
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
npm audit
```

Falls Playwright auf einem neuen Rechner noch keinen Browser besitzt:

```bash
npx playwright install webkit
```

Einzelheiten zu Testebenen, mobilen Viewports und manueller PWA-Prüfung stehen in [docs/TESTING.md](docs/TESTING.md).

## Als PWA auf dem iPhone installieren

1. Die bereitgestellte HTTPS-Adresse in **Safari** öffnen. Für die lokale Entwicklung funktioniert die Installation nur eingeschränkt; für einen realistischen Test die Produktionsversion über HTTPS bereitstellen.
2. Die App einmal vollständig laden, damit die grundlegenden statischen Dateien offline gespeichert werden können.
3. In Safari auf **Teilen** tippen.
4. **Zum Home-Bildschirm** wählen, den Namen prüfen und **Hinzufügen** tippen.
5. Inner Compass anschließend über das neue Home-Bildschirm-Symbol öffnen.

iOS entscheidet selbst, wann eine PWA im Hintergrund pausiert. Fokus- und Meditationstimer rekonstruieren ihren Stand aus gespeicherten Zeitpunkten, dürfen aber nicht als garantiertes Hintergrundsignal oder Wecker verstanden werden.

## Datenhaltung und Datenschutz

Persönliche Daten bleiben in Version 1 auf dem verwendeten Gerät:

- Primär speichert Inner Compass strukturierte Daten in IndexedDB (`inner-compass`, Dexie-Datenbankversion 3).
- Wenn IndexedDB nicht verfügbar ist, wird kontrolliert auf einen einfacheren lokalen Speicher und zuletzt auf einen flüchtigen Speicher ausgewichen. Die App weist auf eingeschränkte Dauerhaftigkeit hin.
- Der PWA-Cache enthält nur App-Shell und öffentliche statische Dateien, niemals die persönlichen IndexedDB-Einträge.
- Es gibt kein Konto, keine Cloud-Synchronisation, keine Analytics, keine Werbung und keine versteckte Telemetrie.
- Es werden keine externen Schriftarten, Tracker oder KI-Dienste benötigt.
- Ein JSON-Export ist die einzige vorgesehene Datensicherung im MVP. Die Exportdatei ist lesbar und **nicht verschlüsselt**; sie sollte entsprechend geschützt werden.
- Das Export- und Entitätsschema bleibt in Version 2. Ältere Version-2-Exporte ohne Planer-Collections bleiben durch additive leere Standardwerte importierbar.
- Das Löschen von Browser- oder Website-Daten kann auch alle Inner-Compass-Daten entfernen. Vorher sollte bei Bedarf ein Export erstellt werden.

## Sicherheit

- Importdateien werden in Größe und Schema begrenzt und vor der Übernahme mit Zod validiert.
- Importierte Datensätze werden nur als Daten behandelt; Inhalte werden nicht ausgeführt.
- React rendert Nutzereingaben als Text. Für persönliche Inhalte wird kein `dangerouslySetInnerHTML` verwendet.
- Es liegen keine Secrets im Frontend und sensible Nutzereingaben gehören nicht in Logs.
- Die lokale Datenbank ist nicht zusätzlich verschlüsselt. Auf gemeinsam genutzten Geräten schützt daher primär die Geräte- beziehungsweise Browser-Sperre.
- Für Produktion ist HTTPS erforderlich, unter anderem für eine zuverlässige Service-Worker-Installation.
- Die lokale Keyword-Erkennung für mögliche akute Gefahr ist absichtlich konservativ, unvollständig und keine professionelle Risikobewertung. In einer akuten Krise sollte unmittelbar eine Person vor Ort, eine medizinische Fachstelle oder der örtliche Notruf kontaktiert werden.

Relevante Abhängigkeiten sollten vor Releases mit `npm audit` geprüft werden. Sicherheitsupdates werden gezielt übernommen; automatische Major-Upgrades ohne Kompatibilitätsprüfung sind nicht vorgesehen.

## PWA- und Offline-Entscheidung

Inner Compass nutzt einen kleinen manuellen Service Worker unter `public/sw.js` statt eines zusätzlichen PWA-Wrappers. Aktuelle Next.js-Versionen und PWA-Wrapper entwickeln sich in unterschiedlichem Tempo; für den kleinen MVP wäre eine weitere Build-Abhängigkeit schwerer nachvollziehbar als die benötigte Cache-Logik selbst.

Der Service Worker ist deshalb bewusst transparent:

- bekannte Shell-Dateien werden beim Installieren unabhängig voneinander vorgeladen;
- Seitennavigationen verwenden das Netz zuerst und fallen danach auf einen gespeicherten Stand oder `offline.html` zurück;
- versionierte Next.js-Dateien und öffentliche statische Assets werden aus dem Cache bedient; neue Worker-Versionen erneuern die vorab geladenen Shell-Dateien;
- fremde Origins, schreibende Requests und persönliche Anwendungsdaten werden nicht abgefangen;
- alte, eindeutig zu Inner Compass gehörende Cache-Versionen werden beim Aktivieren entfernt.

Trade-off: Cache-Regeln und `CACHE_VERSION` müssen bei relevanten Änderungen bewusst gepflegt werden. Die App verspricht keine vollständige Offline-Verfügbarkeit einer Seite, die noch nie erfolgreich geladen wurde.

## Projektstruktur

```text
src/
  app/                 Next.js App Router, Seiten und globale Metadaten
  components/          wiederverwendbare UI- und Feature-Komponenten, darunter der Planer
  domain/              Regeln für Datum, Timer, Muster, Routinen, Aufgaben und Wochenpläne
  lib/                 Persistenz, Validierung, Import und Export
  test/                gemeinsames Test-Setup und Komponententests
public/
  icons/               eigene geometrische App-Icons
  manifest.webmanifest PWA-Metadaten
  sw.js                 kleiner manueller Service Worker
  offline.html          statischer Offline-Fallback
e2e/                    Playwright-Flows
docs/                   Produkt-, Architektur-, Test- und Roadmap-Dokumente
```

Die konkrete technische Aufteilung und das Datenmodell sind in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) beschrieben. Die Produktgrenzen stehen in [docs/PRODUCT.md](docs/PRODUCT.md).

## Bekannte Grenzen des MVP

- keine Konten, Cloud-Synchronisation oder geräteübergreifende Daten
- keine Push-Benachrichtigungen, Kalenderintegration oder verlässlichen Hintergrundalarme
- keine Routine-Reminder, Streaks oder automatische Verteilung des Aufgabenparkplatzes
- keine komplexen Wiederholungsregeln, verschachtelten Routinen oder frei konfigurierbaren Tagesabschnitte
- keine native iOS-/Android-App, Wearable-Anbindung oder biometrische App-Sperre
- kein KI-Chat und keine medizinische oder psychologische Interpretation
- Offline-Nutzung erst nach einem erfolgreichen ersten Laden; Browser können Caches unter Speicherdruck entfernen
- Wake Lock, Töne und haptisches Feedback hängen von Browser, Berechtigungen und Gerätezustand ab
- lokale Keyword-Erkennung kann Krisenformulierungen übersehen oder missverstehen
- Muster sind beschreibende Häufigkeiten, keine Beweise für Ursachen

## Produktgrundsatz

> Weniger analysieren. Klarer entscheiden. Konkret handeln. Bewusst zurückkehren.
