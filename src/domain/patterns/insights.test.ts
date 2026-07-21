import { describe, expect, it } from "vitest";

import { PatternEntrySchema, type PatternEntry } from "../entities";
import { PATTERN_DISCLAIMER, calculatePatternInsights } from "./insights";

function entry(
  index: number,
  overrides: Partial<PatternEntry> = {},
): PatternEntry {
  const timestamp = `2025-04-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`;
  return PatternEntrySchema.parse({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    timeZone: "Europe/Zurich",
    schemaVersion: 2,
    localDate: `2025-04-${String(index + 1).padStart(2, "0")}`,
    occurredAt: timestamp,
    trigger: "work",
    bodyState: "exhausted",
    chosenAction: "walked",
    stateAfter: "somewhat-better",
    ...overrides,
  });
}

describe("vorsichtige Musterberechnung", () => {
  it("macht unter fünf relevanten Einträgen keine Aussage", () => {
    const result = calculatePatternInsights({ entries: [0, 1, 2, 3].map((id) => entry(id)) });
    expect(result.status).toBe("insufficient-data");
    expect(result.insights).toEqual([]);
    expect(result.message).toContain("weniger als fünf");
  });

  it("kennzeichnet Hinweise bei fünf bis neun Datenpunkten ausdrücklich als vorsichtig", () => {
    const result = calculatePatternInsights({ entries: [0, 1, 2, 3, 4, 5].map((id) => entry(id)) });
    const movement = result.insights.find((insight) => insight.id === "movement-and-improvement");
    expect(movement).toMatchObject({
      confidence: "early",
      disclaimer: PATTERN_DISCLAIMER,
      evidence: { sampleSize: 6, matchingCount: 6, ratio: 1 },
    });
    expect(movement?.message).toContain("Vorsichtiger Hinweis");
  });

  it("zeigt ab zehn Einträgen transparente Häufigkeiten, aber keine Kausalbehauptung", () => {
    const entries = Array.from({ length: 10 }, (_, index) =>
      entry(index, index > 6 ? { bodyState: "neutral", stateAfter: "same" } : {}),
    );
    const result = calculatePatternInsights({ entries });
    const body = result.insights.find((insight) => insight.id === "body-state-exhausted");
    expect(body).toMatchObject({
      confidence: "established",
      evidence: { sampleSize: 10, matchingCount: 7, ratio: 0.7 },
      disclaimer: PATTERN_DISCLAIMER,
    });
    expect(body?.message).not.toContain("verursacht");
  });
});
