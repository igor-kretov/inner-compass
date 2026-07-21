# Architektur

## Überblick

Inner Compass ist eine clientseitig nutzbare Next.js-PWA ohne Backend und ohne Konto. Die Architektur trennt Darstellung, Domänenregeln, Persistenz und Validierung, damit sensible Daten lokal bleiben und eine spätere optionale Synchronisation nicht die Oberfläche neu strukturieren muss.

```text
Next.js App Router + React-Komponenten
                 ↓
     Feature- und Domänenfunktionen
                 ↓
       asynchrone Repository-API
          ↙          ↓          ↘
       Dexie     localStorage    Memory
      (primär)     (Fallback)   (letzter Fallback)
```

## Laufzeit und Oberfläche

- **Next.js App Router** übernimmt Routing, Layout und Metadaten.
- **React und TypeScript im Strict Mode** bilden die interaktive Oberfläche.
- **Tailwind CSS 4 und CSS-Tokens** liefern ein kleines responsives Designsystem.
- Die Routen `/today`, `/focus`, `/reset`, `/reflection` und `/settings` entsprechen der Hauptnavigation. `/today` bündelt intern die Tabs Tag, Routinen und Woche; `/onboarding` und `/meditation` sind kontextuelle Flows.
- Das Theme wird über `data-theme="light|dark"` am Dokument gesteuert. Ohne Attribut gilt der Systemmodus; die lokale Präferenz liegt unter `inner-compass-theme`.
- Der Service Worker wird ausschließlich im Produktionsmodus registriert.

## Schichten und Verantwortlichkeiten

| Schicht | Verantwortung | Kennt nicht |
| --- | --- | --- |
| `app` / `components` | Darstellung, Formzustand, Navigation, zugängliche Interaktion | Dexie-Tabellendetails |
| `domain` | Datumsgrenzen, Planerregeln, Timerrekonstruktion, Muster, Hyperfokus-Regeln | React und Browser-Markup |
| `lib` / Services | Use Cases, Mapping, Export, Import, Validierung | visuelle Komponenten |
| Repository | asynchrones Lesen/Schreiben über eine stabile API | konkrete Nutzerführung |
| Dexie / Fallbacks | lokale technische Speicherung | Produktentscheidungen |

Domänenfunktionen bleiben möglichst rein. Dadurch lassen sich zeitabhängige Fälle mit fester Uhrzeit und Zeitzone testen, ohne einen Browser-Timer abzuwarten.

Die React-Oberfläche arbeitet mit einem handlichen `AppState`-Aggregat. `src/lib/app-state-adapter.ts` übersetzt dieses vor jedem Repository-Schreibvorgang vollständig und Zod-validiert in normalisierte Collections und beim Laden wieder zurück. Dadurch bleiben Komponenten einfach, während Export, Migration, stabile Referenzen und pro Datensatz gespeicherte Zeitzonen nur eine kanonische Datenquelle haben.

## Datenmodell

Die lokale Datenbank heißt `inner-compass`; das aktuelle Dexie-Datenbankschema ist Version 3. Typisierte Collections decken diese Entitäten ab:

| Entität | Zweck |
| --- | --- |
| `AppSettings` | Rhythmus, Fokusstandard, Theme, Töne, Haptik, gemerkte Bewegungsarten und ein optionales aktives Identitätsprofil; das alte Ankerfeld bleibt nur importkompatibel |
| `OnboardingState` | Fortschritt und Abschluss des Onboardings |
| `DailyPlan` | lokaler Kalendertag, Tageszustand und Referenzen auf die geordneten Aufgaben |
| `DailyTask` | Haupt- und dynamische Aufgaben mit Tagesabschnitt, optionaler Uhrzeit und stabilem Status |
| `Routine` | wiederkehrende Vorlage mit Wochentagen, Tagesabschnitt, optionaler Uhrzeit und Schritten |
| `RoutineInstance` | unabhängige Momentaufnahme einer Routine für genau einen lokalen Tag |
| `WeeklyPlan` | Wochenfokus, bis zu drei Ergebnisse und Aufgabenparkplatz |
| `FocusSession` | Ziel, erwartetes Ergebnis, persistenter Timer und Abschluss |
| `MeditationSession` | Dauer, Fokus, Zeitpunkte und wertungsfreie Rückmeldung |
| `ResetSession` | kurze Einordnung, körperliche Option und Rückkehrhandlung |
| `DailyReflection` | kompakter Tagesabschluss mit optionalem persönlichem Identitätsbeleg |
| `WeeklyReview` | Antworten und verdichtete Wochenkarte |
| `PatternEntry` | freiwilliger Trigger-, Körper-, Gedanken- und Handlungsdatensatz |
| `EmergencyContact` | optionaler persönlicher Kontakt, nur lokal |

Persistente Datensätze besitzen grundsätzlich eine stabile UUID, `createdAt`, `updatedAt` und – wo fachlich relevant – Schema-Version, IANA-Zeitzone und lokales Tagesdatum. Zeitpunkte werden als UTC-kompatible ISO-Werte gespeichert; ein Kalendertag wird nicht nachträglich aus UTC erraten.

Das Identitätsprofil liegt additiv im nicht indizierten Einstellungsdatensatz und benötigt deshalb keine neue Dexie-Collection. Automatische Belege werden zur Anzeige rein aus vorhandenen Abschlussdaten abgeleitet und nicht als zweites Ereignis gespeichert. So verschwindet ein Beleg wieder, wenn eine Aufgabe bewusst geöffnet wird, und Export beziehungsweise Import behalten nur eine Datenquelle. Gespeichert werden lediglich der aktive glaubwürdige Satz, eine optionale Rückkehrhandlung, optionale Neurahmung, Startzeitpunkt und Tage mit freiwilliger mentaler Probe.

## Planermodell

Der Planer verwendet für Tagesaufgaben und Routinen dieselben drei fachlichen Abschnitte `morning`, `day` und `evening`. Eine optionale lokale Uhrzeit sortiert Einträge innerhalb eines Abschnitts und dient als weicher Startanker; sie ist kein Alarm und erzeugt keine Benachrichtigung.

Ein `DailyPlan` behält genau eine optionale Hauptaufgabe und eine geordnete Liste weiterer Aufgabenreferenzen. Für diese Liste gilt domainseitig eine Obergrenze von 30. `DailyTask` unterscheidet die Zustände `open`, `completed`, `skipped` und `deferred` und speichert die jeweils relevanten Zeitpunkte. Beim Verschieben wird der Ursprung als `deferred` markiert und genau für den nächsten lokalen Kalendertag eine neue, über ihre Herkunft nachvollziehbare Aufgabe angelegt. Wiederholtes Auslösen darf kein zweites Ziel erzeugen.

Eine `Routine` ist eine bearbeitbare Vorlage. Der Produktfluss und der App-Store begrenzen sie auf ein bis sechs Schritte, ausgewählte Wochentage, genau einen Tagesabschnitt und eine optionale Uhrzeit. Für jeden passenden Tag wird höchstens eine `RoutineInstance` materialisiert. Sie übernimmt Titel, Abschnitt, Uhrzeit und Schritte als Momentaufnahme. Dadurch verändern spätere Vorlagenänderungen nur künftig neu erzeugte Instanzen; Löschen oder Pausieren einer Vorlage schreibt protokollierte Tage nicht um. Instanzen können schrittweise erledigt oder für den Tag bewusst ausgelassen werden.

Ein `WeeklyPlan` gehört über Wochenstart und Zeitzone zu genau einer lokalen Woche. Er enthält einen optionalen Fokus, höchstens drei Ergebnisse und bis zu 30 geparkte Aufgaben als technische Obergrenze. Eine geparkte Aufgabe wird erst nach bewusster Datumsauswahl als zugehörige Tagesaufgabe angelegt und im Wochenplan als eingeplant markiert. Es gibt keine automatische Verteilung.

## Lokale Tagesgrenzen und Zeitzonen

„Heute“ ist ein fachlicher Kalendertag in der bei der Erfassung geltenden IANA-Zeitzone, nicht einfach der UTC-Anteil eines Zeitstempels. Die Datumsfunktionen verwenden `Intl` und speichern das lokale Datum neben UTC-Zeitpunkt und Zeitzone. Dadurch bleiben Zuordnungen um Mitternacht und bei Sommer-/Winterzeit nachvollziehbar.

Bei einer Reise gilt für neue Einträge die aktuelle Zone. Bereits gespeicherte Tageszuordnungen bleiben stabil. Diese explizite Entscheidung verhindert, dass ein alter Tagesplan beim späteren Öffnen auf einen anderen Kalendertag rutscht.

## Persistenz und Fallbacks

Die Repository-API ist asynchron und bietet mindestens `get`, `getAll`, `put`, `bulkPut`, `delete`, `clear`, `clearAll` und `exportData`. Dexie wird lazy initialisiert, damit Server-Rendering und Testumgebungen nicht auf Browser-APIs zugreifen müssen.

Version 3 ergänzt die Collections `routines`, `routineInstances` und `weekPlans` sowie zusätzliche Indizes für Tagesaufgaben. Das Upgrade von Datenbankversion 2 ist additiv und löscht keine bestehenden Datensätze. Die technische Dexie-Version ist bewusst unabhängig von der weiterhin als Version 2 geführten Entitäts- und Exportstruktur. Auch der bestehende localStorage-Fallback-Schlüssel `inner-compass:data:v2` bleibt erhalten.

Fallback-Reihenfolge:

1. **IndexedDB über Dexie** – normaler, strukturierter und dauerhafter Betrieb.
2. **localStorage** – eingeschränkter lokaler Ersatz, wenn IndexedDB nicht verfügbar ist.
3. **Memory** – letzter, nur für die laufende Sitzung stabiler Ersatz.

Die UI darf bei einem Fallback nicht so tun, als sei dauerhafte Speicherung garantiert. Speicherfehler werden in verständliche Zustände übersetzt; sensible Inhalte werden nicht protokolliert.

## Timerlogik

Fokus- und Meditationstimer zählen nicht ausschließlich einen React-State herunter. Gespeichert werden:

- tatsächlicher Startzeitpunkt;
- geplantes Ende;
- Zeitpunkt einer Pause;
- bereits akkumulierte Pausenzeit;
- Status und fachliche Dauer.

Die verbleibende Zeit wird aus der aktuellen Uhrzeit und diesen Werten abgeleitet. Nach Reload, Tab-Wechsel, Browserpause oder gedrosselten Timern entsteht dadurch wieder ein korrekter Zustand. Ein UI-Intervall aktualisiert nur die Anzeige; es ist nicht die Zeitquelle.

Ein Browser beziehungsweise iOS kann Hintergrundarbeit trotzdem stoppen. Deshalb ist ein Webtimer kein garantierter Alarm. Zwei aufeinanderfolgende Blöcke oder mindestens 120 Minuten in kurzer Folge lösen eine ruhige Hyperfokus-Unterbrechung aus; bewusstes Weiterarbeiten bleibt möglich.

## Export, Import und Migration

Das Exportformat ist ein lesbarer Envelope der Version 2 mit:

- Format- und Schema-Version;
- UTC-Exportzeitpunkt;
- verständlich benannten Daten-Arrays;
- ausschließlich Anwendungsdaten, ohne Browsermetadaten oder Cache-Inhalte.

Die Arrays für Routinen, Routineinstanzen und Wochenpläne sind in diesem Envelope additiv. Ein gültiger Export der Version 2 aus einer Ausgabe vor dem Planer enthält diese Felder noch nicht; beim Einlesen werden sie deshalb als leere Arrays ergänzt. Neue Planerdaten durchlaufen anschließend dieselbe vollständige Validierung, Vorschau und Konfliktbehandlung wie die bestehenden Collections.

Beim Import wird zuerst die Dateigröße begrenzt und anschließend der gesamte Envelope mit Zod validiert. Version 1 kann deterministisch auf Version 2 migriert werden. Vor dem Schreiben sieht der Nutzer eine Anzahlvorschau und wählt:

- **Ersetzen** – vorhandene lokale Anwendungsdaten werden nach Bestätigung ersetzt;
- **Zusammenführen** – stabile IDs verhindern Duplikate; bei derselben ID gewinnt der Datensatz mit neuerem `updatedAt`.

Importierte Strings bleiben Daten und werden nie als HTML oder Code ausgeführt. Unbekannte beziehungsweise nicht migrierbare Versionen führen zu einer verständlichen Ablehnung, nicht zu einer stillen Teilübernahme.

## Musterberechnung

Muster entstehen lokal aus transparenten Häufigkeiten und gemeinsamem Auftreten. Schwellenwerte sind Teil der Domänenlogik:

- unter 5 relevanten Einträgen: keine Aussage;
- 5–9 Einträge: vorsichtiger Hinweis;
- ab 10 Einträgen: einfache Häufigkeiten und Zusammenhänge.

Die Ausgabe verwendet keine kausale oder diagnostische Sprache. Das Berechnungsmodul liefert Beobachtungen; die UI ergänzt die feste Einordnung, dass gemeinsames Auftreten keine Ursache beweist.

## PWA und Offline-Strategie

`public/manifest.webmanifest` definiert Name, Farben, Standalone-Modus und eigene geometrische Icons. `public/sw.js` verwendet zwei versionierte Caches:

| Anfrage | Strategie | Begründung |
| --- | --- | --- |
| Navigation | Network first, danach gespeicherte Seite, Shell oder `offline.html` | aktuelle App bevorzugen, offline ehrlich reagieren |
| `/_next/static/*` | Cache first | Dateien sind build-versioniert und unveränderlich |
| öffentliche Bilder, Styles, Skripte und Fonts | Cache first | geringe Latenz, keine persönlichen Datensätze |
| fremde Origins, mutierende Requests | nicht abfangen | enger Sicherheits- und Verantwortungsbereich |

Persönliche Daten liegen ausschließlich in der Persistenzschicht und nicht im Cache Storage. Der Offline-Fallback verspricht keine Daten oder Route, die zuvor nie geladen wurde.

Ein Update überspringt die Wartephase nicht ungefragt. Es übernimmt regulär nach dem Schließen alter Clients; so werden HTML und versionierte JavaScript-Dateien verschiedener Builds nicht mitten in einer laufenden Sitzung vermischt. Der Worker versteht zusätzlich eine explizite `SKIP_WAITING`-Nachricht für einen späteren, nutzergesteuerten Update-Dialog.

### Warum kein PWA-Wrapper?

Für den MVP sind ein Manifest, wenige Precache-Einträge und zwei überschaubare Strategien ausreichend. Ein zusätzlicher Next.js-PWA-Wrapper würde:

- eine weitere versionssensible Build-Integration einführen;
- erzeugte Cache-Regeln und Updates schwerer sichtbar machen;
- mehr Abhängigkeiten als Produktnutzen hinzufügen.

Der manuelle Worker ist klein, auditierbar und unabhängig vom Bundler. Der bewusste Trade-off: Bei Änderungen an Shell oder Strategie muss `CACHE_VERSION` gepflegt werden; ein später wachsender Offline-Umfang kann eine Neubewertung rechtfertigen.

## Sicherheit und Datenschutz per Design

- kein Backend, Account, Tracker, Werbe-SDK oder externe KI-API;
- keine fremden Fonts und keine benötigten Requests zu Dritten;
- keine Secrets oder sensiblen Daten in Logs;
- keine HTML-Injektion für Nutzereingaben;
- Importgröße und -schema werden strikt validiert;
- Datenlöschung verlangt eine klare doppelte Bestätigung;
- Krisen-Keywords werden lokal und konservativ geprüft, ohne Diagnosebehauptung;
- ein optionaler Notfallkontakt bleibt lokal.

Die Datenbank ist im MVP nicht zusätzlich verschlüsselt. Gerätesperre, Browserprofil und ein sorgfältiger Umgang mit unverschlüsselten Exportdateien bleiben wichtige Grenzen.

## Barrierefreiheit

Semantische Überschriften, Labels und Statusmeldungen bilden die Grundlage. Alle Flows müssen per Tastatur nutzbar sein, Fokus sichtbar machen, große Touch-Ziele bieten und Informationen nicht allein über Farbe vermitteln. Timerstatus wird für Screenreader sinnvoll, aber nicht in jeder Sekunde störend angekündigt. `prefers-reduced-motion` reduziert nicht notwendige Animationen.

## Bewusste Trade-offs

- **Local first statt Sync:** maximale Datenkontrolle und geringe Einstiegshürde; dafür keine automatische Gerätesicherung.
- **Repository-Abstraktion statt direkter Dexie-Nutzung in Komponenten:** etwas mehr Struktur, aber testbar und später austauschbar.
- **Zeitpunkte statt State-Countdown:** etwas komplexeres Modell, dafür robust bei Reload und Browser-Drosselung.
- **Einfache Häufigkeiten statt „Insights“-Engine:** weniger spektakulär, dafür nachvollziehbar und ohne diagnostische Scheingenauigkeit.
- **Unabhängige Tagesinstanzen statt rückwirkender Vorlagenbindung:** etwas mehr gespeicherte Daten, dafür bleibt die Vergangenheit stabil und nachvollziehbar.
- **Bewusste Wochenzuordnung statt automatischer Verteilung:** ein zusätzlicher Tap, dafür entscheidet der Nutzer selbst, was wirklich in einen Tag gehört.
- **Optionale Uhrzeit statt Reminder:** nützliche Reihenfolge und Orientierung, ohne unzuverlässige PWA-Alarme oder Benachrichtigungsdruck.
- **Manueller Service Worker statt Wrapper:** kleine sichtbare Cache-Logik, dafür bewusste Versionspflege.
