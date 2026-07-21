# Produkt: Inner Compass

## Vision

Inner Compass ist ein ruhiges persönliches Betriebssystem für Menschen, die viel denken und zuverlässig ins Handeln zurückfinden möchten. Die App reduziert eine unübersichtliche Situation auf eine klare Priorität, einen kleinen nächsten Schritt und einen realistischen Arbeitsblock.

> Weniger analysieren. Klarer entscheiden. Konkret handeln. Bewusst zurückkehren.

Inner Compass soll Handlung unterstützen, nicht zu endloser Selbstbeobachtung einladen. Ein Tag darf unvollständig sein. Auslassen wird neutral behandelt: **Heute beginnt neu.**

## Primärer Nutzer

Der MVP richtet sich an einen erwachsenen, stark interessengeleiteten Menschen, der:

- bei spannenden Themen lange fokussiert arbeiten kann, dabei aber Zeit und körperliche Bedürfnisse aus dem Blick verliert;
- monotone, große oder emotional unangenehme Aufgaben eher aufschiebt;
- von Tages- und Wochenplanung, Meditation und Bewegung profitiert;
- wenig tippen und auf einem iPhone sehr schnell einsteigen möchte;
- direkte, erwachsene Sprache statt Übermotivation, Bewertung oder Beschämung bevorzugt;
- Verantwortung übernehmen will, ohne sich durch Diagnosen oder Labels definieren zu lassen.

## Kernprinzipien

### Handlung vor Analyse

Jeder Flow endet möglichst bei einer konkreten Handlung. Die Leitfrage ist nicht „Warum bin ich so?“, sondern „Was ist jetzt der kleinste sinnvolle Schritt?“

### Wenige bewusste Zusagen

Der Tageskern beginnt mit höchstens einer Hauptaufgabe, zwei unterstützenden Aufgaben, einer körperlichen Aktivität, einer Meditation und einer mutigen oder unangenehmen Handlung. Im Planer können weitere konkrete Aufgaben nach Tagesabschnitt ergänzt werden, ohne dadurch zu neuen Hauptprioritäten zu werden. Die Domäne begrenzt diese dynamischen Aufgaben als Sicherheitsgrenze auf 30 pro Tagesplan; diese Zahl ist kein Ziel. Vollständigkeit ist kein Produktziel.

### Struktur ohne Strafe

Es gibt keine Punkte, Rankings, Leistungsnoten, zerstörten Streaks oder roten Warnungen für ausgelassene Routinen. Fortschritt wird als neutrale Kontinuität gezeigt, etwa „An vier der letzten sieben Tage hast du bewusst geplant.“

### Identität durch beobachtbare Belege

Eine glaubwürdige, verhaltensnahe Ausrichtung verbindet Selbstbild und Handlung, etwa „Ich beginne klein und kehre ruhig zurück.“ Sie ist kein positives Etikett und kein Erfolgsversprechen. Tagesplanung, Fokus, Bewegung, Meditation, mutige Handlungen und Routinen erzeugen automatisch ruhige Belege aus ohnehin vorhandenen Daten. Offene oder ausgelassene Punkte werden nie als Gegenbeweis gewertet. Eine 21-Tage-Anzeige ist lediglich ein freiwilliger Review-Rahmen ohne Streak oder Behauptung, Veränderung sei danach abgeschlossen. Eine reine Änderung der kleinen Rückkehrhandlung erhält den Rahmen; ein materiell neuer Identitätssatz beginnt bewusst einen neuen Zeitraum, damit frühere Belege nicht rückwirkend umgedeutet werden.

### Körper und Geist gemeinsam betrachten

Bei Gedankenschleifen oder langem Fokus folgt nicht nur eine weitere Frage. Die App bietet auch Atem, Wasser, Gehen, Bewegung und einen Blick weg vom Bildschirm als konkrete Rückkehr an.

### Local first

Persönliche Planung und Reflexion bleiben standardmäßig auf dem Gerät. Nutzung ist ohne Konto möglich; Export, Import und Löschen bleiben unter Kontrolle des Nutzers.

### Ruhige, zugängliche Gestaltung

Die Oberfläche ist mobile-first, kontrastreich und tastaturbedienbar. Große Touch-Ziele, sichtbare Fokuszustände, semantische Formulare und reduzierte Bewegung haben Vorrang vor visuellen Effekten.

## Informationsarchitektur

Die Hauptnavigation bleibt bei fünf Bereichen:

1. **Heute** – mit den Tabs Tag, Routinen und Woche für Planung und Ausführung
2. **Fokus** – Ergebnis definieren, Timer starten, zurückkehren und abschließen
3. **Reset** – Gedankenschleife in Handlung oder bewusstes Loslassen übersetzen
4. **Reflexion** – Tagesabschlüsse, Wochenreview und vorsichtige Muster
5. **Einstellungen** – Rhythmus, Darstellung, Datenkontrolle und Hinweise

Onboarding und Meditation sind eigenständige, kontextuell erreichbare Flows, aber keine zusätzlichen permanenten Hauptnavigationseinträge.

## Funktionen des MVP

### Onboarding

Vier kurze Schritte erklären den Zweck, erfassen optionale Tageszeiten, wählen eine glaubwürdige Handlungsidentität und schließen mit einem klaren Datenschutz- und Medizinhinweis. Die Fokusdauer bleibt später in den Einstellungen anpassbar. Abbruch blockiert die App nicht dauerhaft; das Onboarding kann später erneut geöffnet werden. Lebensbereiche werden erst wieder aufgenommen, wenn sie als zeitlich begrenzte, planbare Saisons einen sichtbaren Nutzen im Produkt haben.

### Heute

Der wichtigste Screen trennt Vorbereitung und Ausführung. Ein prominenter Einstieg plant den Folgetag idealerweise am Vorabend; beim Öffnen am nächsten Morgen erscheint dieser Plan direkt. Hauptaufgabe und nächster sichtbarer Schritt werden ohne zusätzliches Formular zum konkreten Beleg der gewählten Identität. Eine kurze mentale Probe bleibt freiwillig. Eine Datumsleiste macht weitere Kalendertage erreichbar. Nach dem Speichern wechselt der Tageskern in eine reduzierte Ausführungsansicht. Hauptaufgabe, eine anfangs auf zwei Felder begrenzte, aber erweiterbare Liste zusätzlicher Aufgaben und Routinen erscheinen in den Abschnitten Morgen, Tag und Abend. Bewegung lässt sich aus gemerkten Kategorien wählen oder als neue Kategorie ergänzen. Meditation und mutige Handlung können ebenfalls im Voraus geplant werden. Eine optionale Uhrzeit dient nur als weicher Startanker. Zukünftige Pläne sind noch nicht abhakbar; Aufgaben am aktuellen Tag bleiben ohne Punkte oder Konfetti erledigbar. Ein ungeplanter Tag erhält eine neutrale Einladung, eine Sache zu wählen.

### Planer: Aufgaben, Routinen und Woche

Die drei Today-Tabs trennen verschiedene Planungsebenen, ohne neue Hauptnavigation einzuführen:

- **Tag** zeigt genau den gewählten Kalendertag. Zusätzliche Aufgaben lassen sich einem Tagesabschnitt und optional einer Uhrzeit zuordnen. Jede Aufgabe kann erledigt, bewusst ausgelassen, wieder geöffnet oder auf den nächsten Kalendertag verschoben werden.
- **Routinen** verwaltet wiederkehrende Vorlagen mit einem bis sechs Schritten, ausgewählten Wochentagen, einem festen Tagesabschnitt und einer optionalen Uhrzeit. Die Uhrzeit löst keine Erinnerung aus.
- **Woche** hält einen optionalen Wochenfokus, bis zu drei Ergebnisse und einen Aufgabenparkplatz bereit. Ein geparkter Punkt erscheint erst dann im Tagesplan, wenn er bewusst einem Datum zugeordnet wurde.

Für jeden passenden Tag entsteht eine eigenständige Routineinstanz als Momentaufnahme der Vorlage. Änderungen an einer Vorlage gelten für künftig neu erzeugte Instanzen; bereits protokollierte Tage werden nicht umgeschrieben. Auch das bewusste Auslassen einer Routine bleibt ein neutraler Zustand. Der Planer verwendet weder Streaks noch Reminder, automatische Tagesverteilung oder Strafmechaniken.

### Fokus und Starthelfer

Vor einem Fokusblock steht ein sichtbar erwartetes Ergebnis. Bei aktiver Identitätsausrichtung erinnert ein kurzer, nicht blockierender Hinweis an Ausatmen, körperliches Lösen und den ersten Schritt. Daueroptionen reichen vom 10-Minuten-Einstieg bis zu 90 Minuten beziehungsweise einer begrenzten freien Dauer. Der Timer kann nach Reload aus Zeitpunkten rekonstruiert werden. „Ich bin abgedriftet“ führt zu einem kleinsten nächsten Schritt und einer fünfminütigen Rückkehr; Zurückkehren gilt als Übung, nicht als Scheitern. Nach langen oder aufeinanderfolgenden Blöcken folgt ein ruhiger, übersteuerbarer Körperhinweis.

Der Starthelfer verkleinert eine zu große, langweilige, unklare, angstbesetzte oder unter Erschöpfung beziehungsweise Ablenkung stockende Aufgabe und startet direkt einen zehnminütigen Fokusblock.

### Reset

Der zwei- bis vierminütige Reset ist kein Chatbot. Er benennt den Gedanken, unterscheidet Problem, Entscheidung, Emotion oder wiederkehrendes Szenario, prüft eine Handlung innerhalb von 24 Stunden, führt durch mindestens einen körperlichen Reset und endet mit einer gewählten Rückkehrhandlung.

Eine kleine lokale Liste eindeutiger Krisenformulierungen kann statisch auf professionelle beziehungsweise unmittelbare menschliche Hilfe hinweisen. Sie diagnostiziert nichts und ersetzt keine Risikobewertung.

### Meditation

Ein schlichter Timer unterstützt 5, 10, 20 oder bis zu 60 benutzerdefinierte Minuten. Bei aktiver Identitätsausrichtung ergänzt ein optionaler dreiminütiger Modus Entspannung, den ersten sichtbaren Schritt, erwartbaren Widerstand und eine ruhige Rückkehr. Ein optionaler Fokus, optionale dezente Töne und eine wertungsfreie Abschlussfrage reichen aus. Die Qualität der Meditation wird nicht bewertet.

### Reflexion und Muster

Das Wochenreview ist überspringbar und in ungefähr zehn Minuten machbar. Es erzeugt eine kompakte Wochenkarte aus Ziel, drei Ergebnissen, Bewegung, Meditationsintention und bewusstem Weglassen.

Das Wochenreview bleibt von der direkten Wochenplanung im Today-Tab getrennt: Der Planer organisiert kommende Aufgaben, während das Review rückblickend verdichtet.

Der Bereich „Identität“ zeigt den aktiven Arbeitssatz und automatisch abgeleitete, beobachtbare Belege. Ein optionaler Glaubenssatz-Check stellt vier rationale Prüffragen und speichert nur die bewusst formulierte Neurahmung. Die App macht daraus keine Diagnose, Quote oder Bewertung. Der Tagesabschluss kann höchstens einen zusätzlichen persönlichen Beleg aufnehmen, falls etwas Wichtiges nicht automatisch erkannt wurde.

Das Musterprotokoll bevorzugt Auswahlfelder. Unter fünf relevanten Einträgen zeigt die App keine Aussage, bei fünf bis neun nur vorsichtige Hinweise und ab zehn einfache Häufigkeiten. Jede Formulierung bleibt beobachtend: gemeinsames Auftreten ist kein Beweis für eine Ursache.

### Datenkontrolle

Einstellungen enthalten Identitäts-Kompass, Rhythmus, Fokusdauer, Theme, optionalen Notfallkontakt, erneutes Onboarding, Datenschutzhinweise und App-Version. Alle Nutzerdaten können als lesbares, versioniertes JSON exportiert, nach Vorschau ersetzt oder zusammengeführt und nach doppelter Bestätigung gelöscht werden.

## Erfolg ohne Produktivitäts-Score

Die Standardansicht zeigt höchstens eine ruhige Wochenübersicht. Zulässige Beobachtungen sind beispielsweise:

- Tage mit bewusster Planung;
- begonnene und abgeschlossene Hauptaufgaben;
- erledigte Aufgaben und Routineschritte sowie bewusst ausgelassene oder verschobene Einträge ohne negative Wertung;
- geplante und erledigte Wochenaufgaben;
- Fokusblöcke und Fokuszeit;
- Meditationstage und -minuten;
- Bewegung, Wochenreviews und Reset-Rückkehrhandlungen.

Es gibt keine globale Vergleichbarkeit und keinen zusammengesetzten Score. In den ersten zwei Wochen zählen vor allem drei qualitative Fragen:

- Bringt mich die App schneller zum Beginnen?
- Verliere ich weniger Zeit in Gedankenschleifen?
- Benutze ich die App regelmäßig, ohne mich in ihrer Optimierung zu verlieren?

## Tonalität und Sicherheitsgrenzen

Die App spricht wie ein ruhiger, klarer Mentor: knapp, direkt, nicht verniedlichend. Sie behauptet nicht, ADHS, Angst, Trauma oder andere Erkrankungen zu erkennen oder zu behandeln. Sie ist kein Therapeut, Elternteil, Motivationscoach oder Krisendienst.

Geeignete Sprache: „Nur der nächste Schritt.“ oder „Du musst es nicht vollständig lösen.“

Ungeeignet sind Beschämung, Heilsversprechen, Diagnosen, übertriebene Motivation oder Aussagen wie „Du hast versagt.“

Auch Aussagen wie „Imagination ist für das Nervensystem identisch mit Realität“ oder „nach 21 Tagen ist die Identität umprogrammiert“ werden nicht als Tatsache dargestellt. Mentales Probehandeln darf den Einstieg vertrauter machen; entscheidend bleiben wiederholte konkrete Handlungen.

## Bewusst nicht im MVP

- Benutzerkonten, Bezahlmodell und Cloud-Synchronisation
- soziale Funktionen, Freunde, Ranglisten und Achievements
- KI-Chat, automatische medizinische Interpretation oder therapeutische Empfehlungen
- Push-Benachrichtigungen, Kalenderintegration, Wearables und Sprachaufnahmen
- native Apps und biometrische Sperre
- umfassendes Ernährungs-, Schlaf- oder Substanztracking
- komplexe Ziele, Stimmungskurven mit falscher Präzision und Produktivitäts-Score
- Routine-Streaks, Routine-Reminder und automatische Tageszuordnung
- komplexe Wiederholungsregeln, verschachtelte Routinen und ein minutengenaues Kalender-Zeitraster

Diese Grenzen schützen Einfachheit, Datenschutz und die niedrige Nutzungshürde.
