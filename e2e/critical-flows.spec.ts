import { expect, test, type Locator, type Page } from "@playwright/test";

async function finishOnboarding(page: Page) {
  await expect(page.getByRole("heading", { name: "Nur der nächste klare Schritt." })).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();

  await expect(page.getByRole("heading", { name: "Dein Tagesrhythmus" })).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();

  await expect(page.getByRole("heading", { name: /Wie willst du handeln/ })).toBeVisible();
  await page.getByRole("radio", { name: "Ich kehre ruhig zurück, wenn ich abdrifte." }).check();
  await page.getByRole("button", { name: "Weiter" }).click();

  await expect(page.getByRole("heading", { name: "Privat, lokal, ohne Konto." })).toBeVisible();
  await page.getByRole("button", { name: "Heute klären" }).click();
  await expect(page).toHaveURL(/\/today\/?$/);
}

async function onboardFreshUser(page: Page) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding\/?$/);
  await finishOnboarding(page);
}

const plannerBlocks = [
  "Morgen Block",
  "Organisations Block",
  "Business Block",
  "Sport Block",
  "Bonus Block für Abend",
  "Abend Block",
] as const;

async function prepareDayFromTemplate(page: Page, day: "Heute" | "Morgen") {
  await page.getByRole("button", { name: day, exact: true }).click();
  const offset = day === "Morgen" ? 1 : 0;
  const selectedDate = shiftDate(dateKey(new Date()), offset);
  await expect(
    page.getByRole("heading", { name: `Plan für ${selectedDate.slice(8, 10)}.${selectedDate.slice(5, 7)}.${selectedDate.slice(0, 4)}` }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tag aus Vorlage vorbereiten" }).click();
  for (const block of plannerBlocks) {
    await expect(page.getByRole("heading", { name: block, exact: true })).toBeVisible();
  }
  return selectedDate;
}

async function addTaskToBlock(page: Page, block: string, title: string) {
  await page.getByRole("button", { name: `Aufgabe zu ${block} hinzufügen` }).click();
  await page.getByRole("textbox", { name: `Neue Aufgabe in ${block}` }).fill(title);
  await page.getByRole("button", { name: "Hinzufügen", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: new RegExp(`${title}.*abhaken`) })).toBeVisible();
}

async function dragWithPointer(page: Page, source: Locator, target: Locator) {
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  if (!sourceBox || !targetBox) return;

  const sourcePoint = {
    x: sourceBox.x + sourceBox.width / 2,
    y: sourceBox.y + sourceBox.height / 2,
  };
  const targetPoint = {
    x: targetBox.x + targetBox.width / 2,
    y: targetBox.y + targetBox.height / 2,
  };
  await page.mouse.move(sourcePoint.x, sourcePoint.y);
  await page.mouse.down();
  await page.mouse.move(sourcePoint.x, sourcePoint.y + 12, { steps: 3 });
  await page.mouse.move(targetPoint.x, targetPoint.y, { steps: 12 });
  await page.waitForTimeout(250);
  await page.mouse.up();
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

test.describe("kritische iPhone-Flows", () => {
  test("Onboarding-Zeitfelder bleiben auf schmalen iPhones innerhalb der Karte", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/");
    await page.getByRole("button", { name: "Weiter" }).click();

    const rhythmCard = page.getByRole("group", {
      name: "Zeitfenster für deinen Tagesrhythmus",
    });
    await expect(rhythmCard).toBeVisible();
    const geometry = await rhythmCard.evaluate((card) => {
      const cardRect = card.getBoundingClientRect();
      const controls = [...card.querySelectorAll("input, select")].map((control) => {
        const rect = control.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      });
      return {
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        cardLeft: cardRect.left,
        cardRight: cardRect.right,
        controls,
      };
    });

    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    for (const control of geometry.controls) {
      expect(control.left).toBeGreaterThanOrEqual(geometry.cardLeft - 1);
      expect(control.right).toBeLessThanOrEqual(geometry.cardRight + 1);
    }
  });

  test("A – morgigen Tag aus Vorlage vorbereiten und Checkliste fortsetzen", async ({ page }) => {
    await onboardFreshUser(page);
    const tomorrow = await prepareDayFromTemplate(page, "Morgen");
    await expect(page.getByRole("heading", {
      name: `Plan für ${tomorrow.slice(8, 10)}.${tomorrow.slice(5, 7)}.${tomorrow.slice(0, 4)}`,
    })).toBeVisible();
    await expect(page.getByText(/Pay attention how often/)).toBeVisible();
    await expect(page.getByText("Was ist heute nützlich und sauber? (Fokus)")).toBeVisible();

    const routine = page.getByRole("checkbox", { name: /Morgen Routine.*abhaken/ });
    await routine.check();
    await addTaskToBlock(page, "Business Block", "Angebot versenden");
    await page.reload();
    await page.getByRole("button", { name: "Morgen", exact: true }).click();

    await expect(page.getByRole("checkbox", { name: /Morgen Routine.*wieder öffnen/ })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: /Angebot versenden.*abhaken/ })).toBeVisible();
  });

  test("B – freie Aufgabe in einem kontrolliert beendeten Fokusblock abschließen", async ({ page }) => {
    await onboardFreshUser(page);
    await page.getByRole("link", { name: "Fokus", exact: true }).click();
    await expect(page).toHaveURL(/\/focus\/?$/);
    await page.getByRole("textbox", { name: "Freie Aufgabe" }).fill(
      "Kundenangebot fertigstellen",
    );
    await page.getByLabel("Was soll am Ende dieses Blocks sichtbar fertig sein?").fill(
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
    await expect(page.getByText("Kundenangebot fertigstellen")).toBeVisible();
  });

  test("C – Reset ohne nötige Handlung bis zur gespeicherten Rückkehr", async ({ page }) => {
    await onboardFreshUser(page);
    await page.getByRole("link", { name: "Reset", exact: true }).click();
    await expect(page).toHaveURL(/\/reset\/?$/);

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
    await expect(page).toHaveURL(/\/reflection\/?$/);
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
    await prepareDayFromTemplate(page, "Morgen");
    await addTaskToBlock(page, "Business Block", "Wiederherstellbarer Tagespunkt");
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
    await expect(page).toHaveURL(/\/onboarding\/?$/);

    await finishOnboarding(page);
    await page.getByRole("link", { name: "Einstellungen", exact: true }).click();
    await page.getByLabel("Inner-Compass-JSON-Datei").setInputFiles(exportPath as string);
    await expect(page.getByText("Importvorschau")).toBeVisible();
    await page.getByRole("radio", { name: "Vorhandene ersetzen" }).check();
    await page.getByRole("button", { name: "Import bestätigen" }).click();
    await expect(page.getByRole("status")).toHaveText("Import abgeschlossen.");

    await page.getByRole("link", { name: "Heute", exact: true }).click();
    await page.getByRole("button", { name: "Morgen", exact: true }).click();
    await expect(page.getByRole("checkbox", {
      name: /Wiederherstellbarer Tagespunkt.*abhaken/,
    })).toBeVisible();
  });

  test("F – Aufgabe per Drag-and-drop zwischen Blöcken verschieben und Reihenfolge behalten", async ({ page }) => {
    await onboardFreshUser(page);
    await prepareDayFromTemplate(page, "Morgen");
    await addTaskToBlock(page, "Business Block", "Angebot vorbereiten");

    const source = page.getByRole("button", { name: /Angebot vorbereiten.*verschieben/ });
    const target = page.getByRole("button", { name: /Muay Thai oder Fitness.*verschieben/ });
    await dragWithPointer(page, source, target);

    const sportBlock = page.getByRole("region", { name: "Sport Block" });
    await expect(sportBlock.getByRole("checkbox", {
      name: /Angebot vorbereiten.*abhaken/,
    })).toBeVisible();
    await expect(sportBlock.getByRole("checkbox").first()).toHaveAccessibleName(
      /Angebot vorbereiten.*abhaken/,
    );

    await page.reload();
    await page.getByRole("button", { name: "Morgen", exact: true }).click();
    const persistedSportBlock = page.getByRole("region", { name: "Sport Block" });
    await expect(persistedSportBlock.getByRole("checkbox").first()).toHaveAccessibleName(
      /Angebot vorbereiten.*abhaken/,
    );

    const keyboardHandle = persistedSportBlock.getByRole("button", {
      name: /Angebot vorbereiten.*verschieben/,
    });
    await keyboardHandle.press("Space");
    await keyboardHandle.press("ArrowDown");
    await keyboardHandle.press("Space");
    await expect(persistedSportBlock.getByRole("checkbox").first()).toHaveAccessibleName(
      /Muay Thai oder Fitness.*abhaken/,
    );
    await expect(persistedSportBlock.getByRole("checkbox").nth(1)).toHaveAccessibleName(
      /Angebot vorbereiten.*abhaken/,
    );

    await page.reload();
    const keyboardPersistedBlock = page.getByRole("region", { name: "Sport Block" });
    await expect(keyboardPersistedBlock.getByRole("checkbox").nth(1)).toHaveAccessibleName(
      /Angebot vorbereiten.*abhaken/,
    );
  });

  test("H – Identität mit Tageshandlung, mentaler Probe und Belegen verbinden", async ({ page }) => {
    await onboardFreshUser(page);
    const identity = "Ich kehre ruhig zurück, wenn ich abdrifte.";

    await page.getByRole("link", { name: "Reflexion", exact: true }).click();
    await page.getByRole("button", { name: "Identität" }).click();
    await expect(page.getByRole("heading", { name: identity })).toBeVisible();
    await page.getByRole("button", { name: "20-Sekunden-Probe" }).click();
    const rehearsal = page.getByRole("dialog", { name: "20-Sekunden-Probe" });
    await expect(rehearsal.getByText("Atme länger aus.")).toBeVisible();
    await expect(rehearsal.getByRole("timer")).toHaveAccessibleName("20 Sekunden verbleibend");
    await rehearsal.getByRole("button", { name: "Für heute schließen" }).click();

    await page.getByRole("link", { name: "Heute", exact: true }).click();
    await prepareDayFromTemplate(page, "Heute");
    await addTaskToBlock(page, "Business Block", "Klar beginnen");
    await page.getByRole("checkbox", { name: /Klar beginnen.*abhaken/ }).check();

    await page.getByRole("link", { name: "Reflexion", exact: true }).click();
    await page.getByRole("button", { name: "Identität" }).click();
    await expect(page.getByRole("heading", { name: "Letzte Belege" })).toBeVisible();
    await expect(page.getByText("Aufgabe erledigt: Klar beginnen").last()).toBeVisible();

    await page.getByRole("link", { name: "In der Meditation ausrichten" }).click();
    await page.getByRole("radio", { name: /Ausrichtung/ }).check();
    await expect(page.getByText("3-Minuten-Ausrichtung")).toBeVisible();
    await expect(page.getByText(/Morgen Routine/)).toBeVisible();
  });
});
