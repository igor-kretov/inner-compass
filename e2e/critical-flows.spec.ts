import { expect, test, type Page } from "@playwright/test";

async function finishOnboarding(page: Page) {
  await expect(page.getByRole("heading", { name: "Nur der nächste klare Schritt." })).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();

  await expect(page.getByRole("heading", { name: "Dein Tagesrhythmus" })).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();

  await expect(page.getByRole("heading", { name: /Wie lange möchtest du/ })).toBeVisible();
  await page.getByRole("radio", { name: "25 Minuten" }).check();
  await page.getByRole("button", { name: "Weiter" }).click();

  await expect(page.getByRole("heading", { name: "Was soll dich ausrichten?" })).toBeVisible();
  await page.getByRole("button", { name: "Körper" }).click();
  await page.getByRole("button", { name: "Arbeit" }).click();
  await page.getByRole("button", { name: "Weiter" }).click();

  await expect(page.getByRole("heading", { name: "Privat, lokal, ohne Konto." })).toBeVisible();
  await page.getByRole("button", { name: "Heute klären" }).click();
  await expect(page).toHaveURL(/\/today$/);
}

async function onboardFreshUser(page: Page) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding$/);
  await finishOnboarding(page);
}

async function createDailyPlan(
  page: Page,
  mainTask = "Kundenangebot fertigstellen",
) {
  await page.getByLabel("Hauptaufgabe").fill(mainTask);
  await page.getByLabel("Nächster konkreter Schritt").fill("Dokument öffnen");
  await page.getByLabel("Nebenaufgabe 1").fill("Rückruf erledigen");
  await page.getByLabel("Körper").fill("Spaziergang");
  await page.getByRole("button", { name: "Tag speichern" }).click();
  await expect(page.getByRole("heading", { name: mainTask })).toBeVisible();
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function shiftDate(key: string, days: number) {
  const shifted = new Date(`${key}T12:00:00`);
  shifted.setDate(shifted.getDate() + days);
  return dateKey(shifted);
}

function fullDateLabel(key: string) {
  return new Intl.DateTimeFormat("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${key}T12:00:00`));
}

test.describe("kritische iPhone-Flows", () => {
  test("A – erster Start, Onboarding und Tagesplanung", async ({ page }) => {
    await onboardFreshUser(page);
    await createDailyPlan(page, "Präsentation finalisieren");

    await expect(page.getByText("Dokument öffnen")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Hauptaufgabe abschließen" })).not.toBeChecked();
  });

  test("B – Hauptaufgabe in einem kontrolliert beendeten Fokusblock abschließen", async ({ page }) => {
    await onboardFreshUser(page);
    await createDailyPlan(page);

    await page.getByRole("button", { name: "Jetzt beginnen" }).click();
    await expect(page).toHaveURL(/\/focus\?task=/);
    await expect(page.getByLabel("Was soll am Ende dieses Blocks sichtbar fertig sein?")).toHaveValue(
      "Dokument öffnen",
    );
    await page.getByRole("radio", { name: "10 Min Einstieg" }).check();
    await page.getByRole("button", { name: "Fokus beginnen" }).click();

    await expect(page.getByRole("timer")).toContainText("10:00");
    await page.getByRole("button", { name: "Block beenden" }).click();
    await expect(page.getByRole("heading", { name: "Prüfe das Ergebnis, nicht dein Gefühl." })).toBeVisible();
    await page.getByRole("radio", { name: "Ja" }).check();
    await page.getByLabel(/Was ist der nächste klare Schritt/).fill("An Kundin senden");
    await page.getByRole("button", { name: "Abschluss speichern" }).click();

    await expect(page.getByRole("heading", { name: "Letzte Fokusblöcke" })).toBeVisible();
    await expect(page.getByText("Erreicht", { exact: false })).toBeVisible();
    await page.getByRole("link", { name: "Heute", exact: true }).click();
    await expect(page.getByRole("checkbox", { name: "Hauptaufgabe abschließen" })).toBeChecked();
    await expect(page.getByRole("button", { name: "Erledigt" })).toBeDisabled();
  });

  test("C – Reset ohne nötige Handlung bis zur gespeicherten Rückkehr", async ({ page }) => {
    await onboardFreshUser(page);
    await page.getByRole("link", { name: "Reset", exact: true }).click();
    await expect(page).toHaveURL(/\/reset$/);

    await page.getByRole("button", { name: "Reset beginnen" }).click();
    await page.getByLabel("Kurz benennen").fill("Ich denke dieselbe Situation immer wieder durch");
    await page.getByRole("button", { name: "Weiter" }).click();
    await page.getByRole("radio", { name: "Ein wiederkehrendes Szenario" }).check();
    await page.getByRole("button", { name: "Weiter" }).click();
    await page.getByRole("radio", { name: "Nein" }).check();
    await page.getByRole("radio", { name: "Nicht erneut einplanen" }).check();
    await page.getByRole("button", { name: "Weiter" }).click();

    // Diese Option hat absichtlich keinen Zeitblock; der Test wartet nicht künstlich.
    await page.getByRole("radio", { name: "Wasser trinken" }).check();
    await page.getByRole("button", { name: "Weiter" }).click();
    await page.getByRole("radio", { name: "Hauptaufgabe" }).check();
    await page.getByRole("button", { name: "Zurück ins Leben" }).click();

    await expect(page.getByRole("heading", { name: "Du musst den Gedanken nicht besiegen." })).toBeVisible();
    await expect(page.getByText(/Du kehrst jetzt zurück zu:/)).toContainText("Hauptaufgabe");
    await page.getByRole("button", { name: "Zurück ins Leben" }).click();
    await expect(page.getByText("1").first()).toBeVisible();
  });

  test("D – Wochenreview mit übersprungenen Fragen und gespeicherter Wochenkarte", async ({ page }) => {
    await onboardFreshUser(page);
    await page.getByRole("link", { name: "Reflexion", exact: true }).click();
    await expect(page).toHaveURL(/\/reflection$/);
    await page.getByRole("button", { name: "Wochenreview beginnen" }).click();

    await page.getByLabel(/Deine Beobachtung/).fill("Ich habe die wichtigste Aufgabe begonnen.");
    await page.getByRole("button", { name: "Weiter" }).click();
    for (let question = 2; question <= 10; question += 1) {
      await page.getByRole("button", { name: "Überspringen" }).click();
    }

    await page.getByLabel("Wichtigstes Ergebnis der Woche").fill("Angebot versenden");
    await page.getByLabel("Konkretes Ergebnis 1").fill("Zahlen prüfen");
    await page.getByLabel("Konkretes Ergebnis 2").fill("Feedback einarbeiten");
    await page.getByLabel("Training oder Bewegung").fill("Zweimal Krafttraining");
    await page.getByRole("button", { name: "Wochenkarte speichern" }).click();

    await expect(page.getByText("Aktuelle Wochenkarte")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Angebot versenden" })).toBeVisible();
    await expect(page.getByText("Zahlen prüfen")).toBeVisible();
  });

  test("E – Export, doppelt bestätigtes Löschen und Wiederherstellung per Import", async ({ page }) => {
    await onboardFreshUser(page);
    await createDailyPlan(page, "Wiederherstellbares Tagesziel");
    await page.getByRole("link", { name: "Einstellungen", exact: true }).click();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Daten exportieren" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^inner-compass-export-\d{4}-\d{2}-\d{2}\.json$/);
    const exportPath = await download.path();
    expect(exportPath).not.toBeNull();

    await page.getByRole("button", { name: "Löschen vorbereiten" }).click();
    const deleteDialog = page.getByRole("dialog", {
      name: "Alle lokalen Daten dauerhaft löschen?",
    });
    await expect(deleteDialog.getByRole("button", { name: "Endgültig löschen" })).toBeDisabled();
    await deleteDialog.getByLabel("Bestätigung").fill("LÖSCHEN");
    await deleteDialog.getByRole("button", { name: "Endgültig löschen" }).click();
    await expect(page).toHaveURL(/\/onboarding$/);

    await finishOnboarding(page);
    await page.getByRole("link", { name: "Einstellungen", exact: true }).click();
    await page.getByLabel("Inner-Compass-JSON-Datei").setInputFiles(exportPath as string);
    await expect(page.getByText("Importvorschau")).toBeVisible();
    await page.getByRole("radio", { name: "Vorhandene ersetzen" }).check();
    await page.getByRole("button", { name: "Import bestätigen" }).click();
    await expect(page.getByRole("status")).toHaveText("Import abgeschlossen.");

    await page.getByRole("link", { name: "Heute", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Wiederherstellbares Tagesziel" })).toBeVisible();
  });

  test("F – Routine ausführen, Tagesaufgabe einordnen und auf morgen verschieben", async ({ page }) => {
    await onboardFreshUser(page);
    await createDailyPlan(page, "Tageskern bewahren");

    await page.getByRole("button", { name: "Routinen" }).click();
    await page.getByRole("button", { name: "Neue Routine" }).click();
    await page.getByLabel("Name der Routine").fill("Morgenstart");
    await page.getByLabel("Uhrzeit").fill("07:15");
    // Werktage sind vorausgewählt; beide Wochenendtage machen das Vorkommen datumsunabhängig.
    await page.getByRole("button", { name: "Samstag" }).click();
    await page.getByRole("button", { name: "Sonntag" }).click();
    await page.getByLabel("Schritt 1").fill("Wasser trinken");
    await page.getByRole("button", { name: "Schritt hinzufügen" }).click();
    await page.getByRole("textbox", { name: "Schritt 2", exact: true }).fill("Kurz bewegen");
    await page.getByRole("button", { name: "Routine speichern" }).click();
    await expect(page.getByRole("heading", { name: "Morgenstart" })).toBeVisible();

    await page.getByRole("button", { name: "Tag", exact: true }).click();
    const routineStep = page.getByRole("checkbox", { name: "Wasser trinken in Morgenstart" });
    await routineStep.check();
    await expect(routineStep).toBeChecked();
    await page.getByRole("button", { name: "Heute auslassen" }).click();
    await expect(page.getByText("Heute bewusst ausgelassen")).toBeVisible();
    await expect(routineStep).toBeDisabled();

    await page.getByRole("button", { name: "Aufgabe hinzufügen" }).click();
    await page.getByLabel("Neue Aufgabe").fill("Rechnung senden");
    await page.getByRole("radio", { name: "Abend" }).check();
    await page.getByLabel("Uhrzeit").fill("18:45");
    await page.getByRole("button", { name: "Hinzufügen" }).click();
    await expect(page.getByRole("checkbox", { name: "Rechnung senden" }).locator("..")).toContainText("18:45");

    await page.getByRole("button", { name: "Optionen für Rechnung senden" }).click();
    await page.getByRole("button", { name: /^Auf .* verschieben$/ }).click();
    await expect(page.getByText(/verschoben/).first()).toBeVisible();

    const tomorrow = shiftDate(dateKey(new Date()), 1);
    const tomorrowButton = page.getByRole("button", { name: fullDateLabel(tomorrow) });
    if (await tomorrowButton.count() === 0) {
      await page.getByRole("button", { name: "Nächste Woche" }).click();
    }
    await page.getByRole("button", { name: fullDateLabel(tomorrow) }).click();
    await expect(page.getByRole("heading", { name: "Rechnung senden" })).toBeVisible();
    await expect(page.getByText("Startanker · 18:45")).toBeVisible();
  });

  test("G – Wochenaufgabe speichern, einem Tag zuordnen und im Tagesplan öffnen", async ({ page }) => {
    await onboardFreshUser(page);
    await page.getByRole("button", { name: "Woche", exact: true }).click();

    await page.getByLabel("Wichtigster Fokus").fill("Website veröffentlichen");
    await page.getByLabel("Wochenergebnis 1").fill("Texte freigeben");
    await page.getByLabel("Wochenaufgabe 1").fill("Team-Freigabe einholen");
    await page.getByRole("button", { name: "Wochenplan speichern" }).click();
    await expect(page.getByRole("heading", { name: "Website veröffentlichen" })).toBeVisible();

    await page.getByRole("button", { name: "Einplanen" }).click();
    const scheduleDialog = page.getByRole("dialog", { name: "Welcher Tag passt?" });
    await scheduleDialog.getByRole("button", { name: /Heute/ }).click();
    await expect(page.getByText(/Eingeplant für/)).toBeVisible();

    const weeklyItem = page.getByRole("checkbox", {
      name: "Team-Freigabe einholen als Wochenaufgabe erledigt",
    });
    await weeklyItem.locator("..").getByRole("button", { name: "Tag öffnen" }).click();
    await expect(page.getByRole("button", { name: "Tag", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Team-Freigabe einholen" })).toBeVisible();
  });
});
