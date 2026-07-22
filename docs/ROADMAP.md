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

Ein leerer Kalendertag lässt sich mit einem Tap aus einer Tagesvorlage vorbereiten. Danach zeigt Today nur eine datierte, geordnete Checkliste mit sechs Blöcken: Morgen, Organisation, Business, Sport, Bonus für den Abend und Abend. Punkte lassen sich ergänzen, löschen, abhaken und per Drag-and-drop innerhalb eines Blocks oder zwischen Blöcken verschieben. Reihenfolge und Status bleiben lokal erhalten.

### Reibungsarme Vorbereitung am Vorabend

Der Einstieg richtet sich standardmäßig auf den nächsten Tag. „Tag aus Vorlage vorbereiten“ kopiert die Standardblöcke und ihre Punkte genau einmal in den gewählten Tag. Am Morgen ist kein erneutes Planungsformular nötig; der vorbereitete Plan ist sofort ausführbar.

### Dynamische Tagesaufgaben

Neue Punkte entstehen direkt in dem Block, in dem sie gebraucht werden. Es gibt keine getrennten Felder für Hauptaufgabe, Nebenaufgaben, Bewegung, Meditation, mutige Handlung, Routine oder Uhrzeit. Die Domäne setzt 31 Checklistenpunkte als technische Obergrenze, nicht als Planungsziel.

### Ruhige Orientierung

Eine kurze Aufmerksamkeitsintention und die Frage „Was ist heute nützlich und sauber?“ können oberhalb der Blöcke Orientierung geben. Beide bleiben Teil des Plans statt ein separater Reflexions- oder Bewertungsfluss zu werden.

## Phase 2 – stärkere lokale Struktur

### Optionale lokale Erinnerungen

Erinnerungen nur dort, wo PWA und Betriebssystem sie zuverlässig und mit klarer Zustimmung unterstützen. Keine Schuldtexte, keine Dauerbenachrichtigungen und kein verstecktes Tracking. iOS-Grenzen werden vor Umsetzung auf echten Geräten geprüft.

### Übergreifende Kalenderansicht

Die bestehende Datumsleiste des Today-Planers könnte zu einer gemeinsamen Navigation für Tagespläne und Reviews erweitert werden. Kein vollständiger Kalenderersatz und zunächst keine externe Kalenderintegration.

### Bearbeitbare Tagesvorlagen

Der MVP liefert zunächst eine konkrete Standardvorlage. Erst reale Nutzung soll zeigen, ob mehrere benannte Vorlagen oder ein eigener Vorlageneditor Reibung reduzieren. Eine solche Erweiterung darf den täglichen Screen nicht wieder mit Kategorien, Zeitfeldern oder Konfiguration überladen.

### Fokus-Saisons statt statischer Lebensanker

Lebensbereiche wie Körper, Arbeit oder Beziehungen werden nicht als folgenlose Dauerauswahl geführt. Eine spätere Saison-Funktion soll einen Bereich für einen selbst gewählten Zeitraum priorisieren, ein überprüfbares Ziel und einen End- oder Reviewzeitpunkt festhalten und den bewussten Wechsel in die nächste Saison ermöglichen. Vor Umsetzung muss geklärt sein, welche sichtbaren Empfehlungen oder Planungsentscheidungen sich daraus tatsächlich ergeben; reine Kennzeichnung ohne Wirkung bleibt ausgeschlossen.

### Identitäts-Saisons und frei wählbare Review-Zeiträume

Der MVP führt genau eine aktive, glaubwürdige Handlungsidentität und einen unverbindlichen 21-Tage-Review-Rahmen. Später kann daraus eine versionierte Saison mit frei wählbarem Enddatum und bewusstem Rückblick werden. Frühere Sätze und ihre damaligen Belege dürfen dabei nicht rückwirkend umgedeutet werden. Eine feste 21-Tage-Erfolgsschwelle, Streak oder „Thermostat-Score“ bleibt ausgeschlossen.

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
