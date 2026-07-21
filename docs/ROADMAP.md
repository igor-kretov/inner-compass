# Roadmap

Der aktuelle MVP bleibt bewusst local-first, ohne Konto, Cloud, Push, externe Kalenderintegration oder KI. Der erreichte Planerstand ist unten ausdrücklich als umgesetzt markiert; die anschließenden Phasen sind mögliche spätere Erweiterungen, keine bereits zugesagten oder versteckt vorbereiteten Funktionen.

## Leitplanken für jede Erweiterung

Eine neue Funktion kommt nur infrage, wenn sie:

- schneller zu einer konkreten Handlung führt oder verlässlich Reibung reduziert;
- Datenschutz und Datenhoheit verständlich wahrt;
- den Kernfluss nicht mit zusätzlichen Kennzahlen oder Navigation überlädt;
- auf mobilen Geräten zuverlässig genug funktioniert;
- keine Diagnose, Therapiebehauptung oder manipulative Gamification einführt;
- anhand echter Nutzung validiert wurde.

Vor Ausbau werden zwei Wochen reale Nutzung anhand dieser Fragen beobachtet:

- Bringt mich die App schneller zum Beginnen?
- Verliere ich weniger Zeit in Gedankenschleifen?
- Benutze ich die App regelmäßig, ohne mich in ihrer Optimierung zu verlieren?

## Im aktuellen MVP umgesetzt

### Today-Planer

Die Tabs Tag, Routinen und Woche bündeln tägliche Ausführung, wiederkehrende Abläufe und eine schlanke Wochenplanung. Tagesaufgaben und Routinen sind den Abschnitten Morgen, Tag oder Abend zugeordnet; eine optionale Uhrzeit bleibt ein weicher Startanker ohne Reminder.

### Wiederkehrende Vorlagen

Routinen bestehen aus einem bis sechs Schritten, ausgewählten Wochentagen, einem Tagesabschnitt und einer optionalen Uhrzeit. Für jeden passenden Tag entsteht eine unabhängige Instanz. Änderungen gelten nur für künftig neu erzeugte Vorkommen; protokollierte Tage bleiben erhalten. Routinen und einzelne Tagesinstanzen dürfen bewusst pausiert beziehungsweise ausgelassen werden, ohne Streak oder Strafe.

### Dynamische Tagesaufgaben

Neben dem bewusst kleinen Tageskern können zusätzliche Aufgaben erfasst werden. Sie lassen sich erledigen, auslassen, wieder öffnen oder genau auf den nächsten lokalen Kalendertag verschieben. Die Domäne setzt 30 Einträge als technische Obergrenze, nicht als Planungsziel.

### Schlanke Wochenplanung

Ein Wochenplan enthält einen optionalen Fokus, bis zu drei Ergebnisse und einen Aufgabenparkplatz. Eine geparkte Aufgabe gelangt erst nach bewusster Auswahl eines Datums in den Tagesplan; es gibt keine automatische Verteilung.

## Phase 2 – stärkere lokale Struktur

### Optionale lokale Erinnerungen

Erinnerungen nur dort, wo PWA und Betriebssystem sie zuverlässig und mit klarer Zustimmung unterstützen. Keine Schuldtexte, keine Dauerbenachrichtigungen und kein verstecktes Tracking. iOS-Grenzen werden vor Umsetzung auf echten Geräten geprüft.

### Übergreifende Kalenderansicht

Die bestehende Datumsleiste des Today-Planers könnte zu einer gemeinsamen Navigation für Tagespläne und Reviews erweitert werden. Kein vollständiger Kalenderersatz und zunächst keine externe Kalenderintegration.

### App-Sperre oder Geräteschutz

Prüfung einer lokalen Sperre beziehungsweise Nutzung sicherer Plattformfunktionen. Vor Implementierung müssen Wiederherstellung, Datenverlust-Risiko und die Grenzen einer reinen Web-App geklärt sein.

## Phase 3 – optionale Geräte- und Cloud-Funktionen

### Optionales Konto

Die App bleibt ohne Konto nutzbar. Ein Konto wäre ausschließlich für freiwillige Synchronisation erforderlich und darf lokale Nutzung nicht abwerten.

### Verschlüsselte Cloud-Synchronisation

Nur mit expliziter Zustimmung, nachvollziehbarem Bedrohungsmodell und einer klaren Aussage dazu, welche Metadaten trotz Verschlüsselung sichtbar bleiben. Konfliktauflösung, Schlüsselwiederherstellung, Löschung und Offline-Verhalten müssen vorab spezifiziert werden.

### Native iOS- und Android-Version

Erst sinnvoll, wenn reale Nutzung zeigt, dass PWA-Grenzen bei Timern, Erinnerungen, Geräteschutz oder Hintergrundverhalten den Kernnutzen deutlich beeinträchtigen. Die lokale Datenportabilität bleibt erhalten.

### Kalenderintegration

Nur minimal benötigte Berechtigungen, getrennte Lese-/Schreibzustimmung und verständliche Vorschau vor Änderungen. Keine automatische Übernahme persönlicher Reflexionen in einen Kalender.

### Streng begrenzte KI-Zusammenfassungen

Nur mit expliziter Zustimmung pro Nutzung, transparenter Datenvorschau, klarer Lösch- und Anbieterinformation sowie einer vollständig lokalen Alternative. Keine Diagnosen, Therapieempfehlungen, versteckte Profilbildung oder dauerhafte Übertragung sensibler Journaleinträge.

## Nicht Teil dieser Roadmap

Rankings, soziale Vergleiche, Produktivitäts-Scores, manipulative Streaks und automatische medizinische Interpretation widersprechen den Produktprinzipien. Sie werden nicht als spätere Standardfunktion vorgesehen.
