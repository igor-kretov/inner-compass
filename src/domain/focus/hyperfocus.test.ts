import { describe, expect, it } from "vitest";

import { FocusSessionSchema, type FocusSession } from "../entities";
import { evaluateHyperfocusProtection } from "./hyperfocus";

function session(
  index: number,
  startedAt: string,
  endedAt: string,
  options: Partial<FocusSession> = {},
): FocusSession {
  const duration = (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1_000;
  return FocusSessionSchema.parse({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    createdAt: startedAt,
    updatedAt: endedAt,
    timeZone: "Europe/Zurich",
    schemaVersion: 2,
    localDate: "2025-04-10",
    taskLabel: "Bericht",
    intendedOutcome: "Erste Seite fertig",
    status: "completed",
    plannedDurationSeconds: duration,
    startedAt,
    plannedEndAt: endedAt,
    endedAt,
    ...options,
  });
}

describe("Hyperfokus-Unterbrechungslogik", () => {
  it("empfiehlt nach zwei direkt aufeinanderfolgenden Blöcken eine Körperpause", () => {
    const result = evaluateHyperfocusProtection(
      [
        session(1, "2025-04-10T08:00:00.000Z", "2025-04-10T08:50:00.000Z"),
        session(2, "2025-04-10T09:00:00.000Z", "2025-04-10T09:50:00.000Z"),
      ],
      new Date("2025-04-10T09:51:00.000Z"),
    );
    expect(result.requiresBreak).toBe(true);
    expect(result.reasons).toContain("consecutive-blocks");
    expect(result.message).toContain("zurück in den Körper");
  });

  it("reagiert auch auf 120 Minuten im rollierenden Vierstundenfenster", () => {
    const result = evaluateHyperfocusProtection(
      [
        session(1, "2025-04-10T07:00:00.000Z", "2025-04-10T08:00:00.000Z"),
        session(2, "2025-04-10T09:00:00.000Z", "2025-04-10T10:00:00.000Z"),
      ],
      new Date("2025-04-10T10:01:00.000Z"),
    );
    expect(result.consecutiveCount).toBe(1);
    expect(result.focusMinutesInWindow).toBe(120);
    expect(result.reasons).toEqual(["focus-time"]);
  });

  it("beginnt nach einer bewusst bestätigten Unterbrechung neu zu zählen", () => {
    const result = evaluateHyperfocusProtection(
      [
        session(1, "2025-04-10T08:00:00.000Z", "2025-04-10T08:50:00.000Z"),
        session(2, "2025-04-10T09:00:00.000Z", "2025-04-10T09:50:00.000Z", {
          hyperfocusBreakChoice: "water",
          hyperfocusAcknowledgedAt: "2025-04-10T09:51:00.000Z",
        }),
      ],
      new Date("2025-04-10T09:52:00.000Z"),
    );
    expect(result.requiresBreak).toBe(false);
    expect(result.focusMinutesInWindow).toBe(0);
  });
});
