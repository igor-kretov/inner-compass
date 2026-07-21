# Teststrategie

## Ziel

Tests schützen die Stellen, an denen falsche Ergebnisse oder Datenverlust besonders wahrscheinlich wären: lokale Tagesgrenzen, unabhängige Routineinstanzen, Aufgabenstatus und Verschiebungen, Wochenzuordnung, persistente Timer, Import/Export, Migrationen, Zusammenführung und die Schwellenwerte vorsichtiger Musterhinweise. Oberflächentests sichern die wichtigsten Handlungsflüsse auf mobilen Viewports.

Die Testpyramide besteht aus schnellen Unit-Tests, gezielten Komponententests und wenigen vollständigen Playwright-Flows.

## Befehle

```bash
# TypeScript Strict Mode
npm run typecheck

# ESLint; Warnungen gelten als Fehler
npm run lint

# Unit- und Komponententests einmalig
npm run test

# Vitest im Beobachtungsmodus
npm run test:watch

# End-to-End-Tests
npm run test:e2e

# Produktionskompilierung
npm run build

# bekannte Dependency-Probleme prüfen
npm audit
```

Die Planer-Domäne sowie ihre Persistenz- und Transfergrenzen lassen sich gezielt ausführen:

```bash
npm run test -- src/domain/planner src/lib/app-state-adapter.test.ts src/lib/data-transfer.test.ts src/lib/db/repository.test.ts
```

Auf einer frischen Umgebung benötigt Playwright einmalig einen Browser:

```bash
npx playwright install webkit
```

## Unit-Tests

Unit-Tests laufen in Vitest. Browsernahe Module verwenden JSDOM und das gemeinsame Setup unter `src/test/setup.ts`. Zeitabhängige Tests setzen eine feste Systemzeit und eine explizite IANA-Zeitzone; sie dürfen nicht vom Rechnerdatum des Entwicklers abhängen.

Wichtige Abdeckung:

- lokaler Tageswechsel, Mitternacht und Sommer-/Winterzeit;
- Timerrekonstruktion nach Reload, Pause und Browser-Drosselung;
- effektive Fokusdauer aus Start-, Ende- und Pausenwerten;
- Hyperfokus-Hinweis nach aufeinanderfolgenden Blöcken beziehungsweise 120 Minuten;
- versionierter Datenexport ohne Browsermetadaten;
- Größen- und Schemavalidierung beim Import;
- Migration von Exportversion 1 auf 2;
- additiver Import älterer Exporte der Version 2 ohne Planer-Collections;
- Ersetzen und Zusammenführen, ID-Dedupe und Konfliktauflösung über `updatedAt`;
- Routine-Materialisierung nur an passenden Wochentagen, idempotente Erzeugung und stabile Vorlagen-Momentaufnahmen;
- unabhängige Routineschritte sowie neutrales Auslassen einer Tagesinstanz;
- bis zu 30 dynamische Tagesaufgaben und Kompatibilität mit dem bisherigen Primär-/Sekundärmodell;
- getrennte Zustände für Erledigen, Auslassen und Wiederöffnen sowie genau eine stabile Verschiebung auf den nächsten lokalen Tag;
- Wochenfokus, höchstens drei Ergebnisse, ein auf 30 begrenzter Aufgabenparkplatz und unabhängige Status-/Datumsänderungen;
- Datenbankversion 3 mit CRUD und Export für Routinen, Routineinstanzen und Wochenpläne;
- verlustfreier Planer-Roundtrip durch Export, Import und `AppState`-Adapter;
- Musterschwellen unter 5, bei 5–9 und ab 10 Einträgen;
- konservative lokale Krisenformulierungen, einschließlich unkritischer Gegenbeispiele.

## Komponententests

React Testing Library prüft Verhalten aus Nutzersicht. Abfragen erfolgen bevorzugt über Rollen, Namen, Labels und sichtbare Texte statt CSS-Klassen. Abgedeckt werden insbesondere:

- Tagesplanung speichern, reduziert anzeigen, bearbeiten und Aufgabe abschließen;
- zugänglich zwischen den Today-Tabs Tag, Routinen und Woche wechseln;
- eine Routine mit Wochentagen, optionaler Uhrzeit und mehreren Schritten anlegen;
- einen Routineschritt abhaken und die Tagesinstanz bewusst auslassen;
- eine Aufgabe mit Tagesabschnitt und Uhrzeit anlegen und auf morgen verschieben;
- einen Wochenplan speichern, eine geparkte Aufgabe bewusst einem Tag zuordnen und diesen Tag öffnen;
- Starthelfer bis zum 10-Minuten-Block;
- Reset-Flow einschließlich Körperauswahl und Rückkehr;
- Fokusabschluss mit Ergebnis und nächstem Schritt;
- Meditation speichern und wertungsfrei abschließen;
- Identitätsausrichtung, kurze mentale Probe und automatisch abgeleitete Belege;
- Ausrichtungsmeditation mit dem konkreten nächsten Schritt des Tagesplans;
- Wochenreview mit übersprungenen Fragen;
- Einstellungen sowie Importvorschau;
- doppelte Bestätigung vor vollständigem Löschen.

Für Persistenztests werden isolierte Repository-Instanzen beziehungsweise Fakes genutzt. Kein Test darf echte Browserdaten eines Entwicklers verändern.

## End-to-End-Flows

Playwright startet die App gemäß `playwright.config.ts` und verwendet mindestens einen modernen iPhone-ähnlichen Viewport. Die sieben kritischen Wege sind:

### A – Erster Start

1. App ohne Daten öffnen.
2. Onboarding abschließen.
3. Tagesplan erstellen.
4. gespeicherte Hauptaufgabe sehen.

### B – Aufgabe starten

1. Hauptaufgabe öffnen.
2. 10-Minuten-Fokus starten.
3. Block kontrolliert beenden.
4. Ergebnis erfassen.
5. Session im Verlauf sehen.

### C – Reset

1. Reset öffnen und Gedanken eingeben.
2. „keine Handlung nötig“ wählen.
3. körperlichen Reset durchführen.
4. Rückkehrhandlung auswählen.
5. Session speichern.

### D – Wochenreview

1. Review starten.
2. Fragen teilweise beantworten oder überspringen.
3. Wochenziel und Ergebnisse setzen.
4. Wochenkarte speichern.

### E – Export und Import

1. deterministische Testdaten erzeugen.
2. Exportdatei laden.
3. lokale Daten über die UI löschen.
4. Export wieder importieren und bestätigen.
5. wiederhergestellte Anzahl und Kerninhalt prüfen.

### F – Routine und Tagesaufgabe

1. Today öffnen und eine Routine mit mehreren Schritten anlegen.
2. im Tag-Tab einen Schritt der heutigen Instanz erledigen.
3. eine zusätzliche Tagesaufgabe mit Abschnitt und Uhrzeit anlegen.
4. die Aufgabe bewusst auf morgen verschieben.
5. im nächsten Tag die übertragene Aufgabe prüfen.

### G – Wochenaufgabe einem Tag zuordnen

1. im Woche-Tab Fokus, Ergebnisse und eine geparkte Aufgabe speichern.
2. die Aufgabe bewusst einem Datum zuordnen.
3. den zugeordneten Tag öffnen.
4. die Aufgabe im Tagesplan prüfen.

Timer-E2E-Tests warten nicht zehn echte Minuten. Sie verwenden kontrollierte Zeit oder einen expliziten Testpfad, ohne Produktionsdaten mit Demo-Einträgen zu vermischen.

## Manuelle PWA-Prüfung

Service Worker und Offline-Verhalten werden mit einer Produktionsversion geprüft:

1. `npm run build` und `npm run start` ausführen.
2. App online öffnen und die Service-Worker-Registrierung in den Browser-Werkzeugen prüfen.
3. Manifest, 192-/512-PNG und maskierbares Icon prüfen.
4. mindestens `/today` einschließlich aller drei Tabs, `/focus`, `/reset`, `/reflection` und `/settings` einmal laden.
5. Browser auf offline stellen und eine bereits geladene Route erneut öffnen.
6. eine noch nie geladene Route öffnen und den verständlichen Fallback prüfen.
7. wieder online gehen und kontrollieren, dass aktuelle Inhalte geladen werden.
8. neue `CACHE_VERSION` simulieren und prüfen, dass nur alte `inner-compass-*`-Caches verschwinden.

Zusätzlich auf einem echten iPhone testen:

- Installation über Safari → Teilen → Zum Home-Bildschirm;
- Safe Areas, Bottom Navigation und Tastatur bei Textfeldern;
- Standalone-Start, Theme-Farbe und App-Icon;
- Timer nach Bildschirmwechsel beziehungsweise erneutem Öffnen;
- Today-Tabs, Datumsleiste und die Abschnitte Morgen, Tag und Abend auf schmaler Breite;
- Routine anlegen, Schritt abhaken, Tagesinstanz auslassen und danach einen anderen Tag öffnen;
- zusätzliche Aufgabe mit Uhrzeit verschieben sowie eine geparkte Wochenaufgabe bewusst einem Tag zuordnen;
- Verhalten ohne Netz nach einem vollständigen ersten Laden.

Ein erfolgreicher Desktop-Lighthouse-Lauf ersetzt diese iOS-Prüfung nicht.

## Manuelle Barrierefreiheitsprüfung

- alle Funktionen nur per Tastatur bedienen;
- Fokusreihenfolge und Fokusindikator kontrollieren;
- 200 % Zoom und schmale mobile Breite prüfen;
- Light und Dark Mode auf ausreichenden Kontrast prüfen;
- reduzierte Bewegung über die Systemeinstellung testen;
- Formfehler mit Screenreader oder Accessibility Tree prüfen;
- Timerstatus darf verständlich sein, ohne sekündlich den Screenreader zu überladen;
- Zustände müssen neben Farbe immer Text oder Symbol besitzen.

## Daten- und Sicherheitsprüfung

- ungültiges JSON, falsche Version und zu große Datei ablehnen;
- unbekannte Felder beziehungsweise Typfehler nicht stillschweigend ausführen;
- Duplikate und ältere Konfliktstände kontrollieren;
- einen gültigen Export der Version 2 ohne `routines`, `routineInstances` und `weekPlans` importieren und leere Planer-Collections prüfen;
- persönliche Eingaben mit HTML-ähnlichem Text sicher als Text anzeigen;
- nach „Alle Daten löschen“ Datenbank, Fallback-Speicher und UI-Zustand prüfen;
- Cache Storage kontrollieren: dort dürfen keine Nutzereinträge liegen;
- `npm audit` bewerten und relevante Funde dokumentiert beheben, ohne blinde Major-Upgrades.

## Abschlussprotokoll

Vor einem Release werden die tatsächlich ausgeführten Befehle mit Ergebnis notiert. Ein Test gilt nur dann als bestanden, wenn er in der aktuellen Umgebung vollständig gelaufen ist. Fehlt beispielsweise ein Playwright-Browser oder blockiert die Umgebung einen echten iOS-Test, wird genau diese Einschränkung benannt und nicht als Erfolg dargestellt.
