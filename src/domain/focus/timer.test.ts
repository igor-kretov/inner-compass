import { describe, expect, it } from "vitest";

import {
  calculateFocusDurationSeconds,
  createPersistedTimer,
  finishTimer,
  pauseTimer,
  reconstructTimer,
  resumeTimer,
} from "./timer";

describe("persistenter Timer", () => {
  it("rekonstruiert die Restzeit nach einem Reload aus absoluten Zeitpunkten", () => {
    const timer = createPersistedTimer(50 * 60, new Date("2025-04-10T10:00:00.000Z"));
    const snapshot = reconstructTimer(timer, new Date("2025-04-10T10:20:00.000Z"));
    expect(snapshot).toMatchObject({
      effectiveStatus: "running",
      elapsedSeconds: 20 * 60,
      remainingSeconds: 30 * 60,
      shouldPersistCompletion: false,
    });
  });

  it("zählt während einer Pause auch nach langem Schließen nicht weiter", () => {
    const timer = createPersistedTimer(25 * 60, new Date("2025-04-10T10:00:00.000Z"));
    const paused = pauseTimer(timer, new Date("2025-04-10T10:10:00.000Z"));
    const snapshot = reconstructTimer(paused, new Date("2025-04-11T10:00:00.000Z"));
    expect(snapshot.elapsedSeconds).toBe(10 * 60);
    expect(snapshot.remainingSeconds).toBe(15 * 60);
    expect(snapshot.effectiveStatus).toBe("paused");
  });

  it("verschiebt beim Fortsetzen das geplante Ende um die Pausendauer", () => {
    const timer = createPersistedTimer(50 * 60, new Date("2025-04-10T10:00:00.000Z"));
    const paused = pauseTimer(timer, new Date("2025-04-10T10:10:00.000Z"));
    const resumed = resumeTimer(paused, new Date("2025-04-10T10:20:00.000Z"));
    expect(resumed.accumulatedPausedMs).toBe(10 * 60 * 1_000);
    expect(resumed.plannedEndAt).toBe("2025-04-10T11:00:00.000Z");
    expect(reconstructTimer(resumed, new Date("2025-04-10T11:00:00.000Z"))).toMatchObject({
      effectiveStatus: "elapsed",
      remainingSeconds: 0,
      shouldPersistCompletion: true,
    });
  });

  it("berechnet echte Fokusdauer ohne Pausen und begrenzt verwaiste Timer", () => {
    const timer = createPersistedTimer(10 * 60, new Date("2025-04-10T10:00:00.000Z"));
    const paused = pauseTimer(timer, new Date("2025-04-10T10:04:00.000Z"));
    const resumed = resumeTimer(paused, new Date("2025-04-10T10:09:00.000Z"));
    const completed = finishTimer(resumed, "completed", new Date("2025-04-10T10:12:00.000Z"));
    expect(calculateFocusDurationSeconds(completed)).toBe(7 * 60);

    const abandoned = createPersistedTimer(10 * 60, new Date("2025-04-10T10:00:00.000Z"));
    expect(calculateFocusDurationSeconds(abandoned, new Date("2025-04-11T10:00:00.000Z"))).toBe(
      10 * 60,
    );
  });
});
