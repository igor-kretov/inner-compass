import { describe, expect, it } from "vitest";

import { containsClearCrisisPhrase } from "./safety";

describe("lokale statische Sicherheitslogik", () => {
  it("erkennt nur dokumentierte eindeutige Formulierungen tolerant gegenüber Satzzeichen", () => {
    expect(containsClearCrisisPhrase("Ich will mich umbringen.")) .toBe(true);
    expect(containsClearCrisisPhrase("I WANT TO END MY LIFE!")) .toBe(true);
  });

  it("interpretiert allgemeine Belastung nicht automatisch als akute Selbstgefährdung", () => {
    expect(containsClearCrisisPhrase("Ich bin erschöpft und alles ist gerade zu viel.")).toBe(false);
    expect(containsClearCrisisPhrase("Ich habe Angst vor dem Ergebnis.")).toBe(false);
  });
});
