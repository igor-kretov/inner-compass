import { describe, expect, it } from "vitest";

import {
  getLocalDateKey,
  getLocalDayRange,
  isInLocalDay,
  sessionLocalDate,
  startOfLocalWeek,
  zonedDateTimeToInstant,
} from "./dates";

describe("lokale Datums- und Zeitzonenlogik", () => {
  it("bildet die Zürcher Mitternachtsgrenze korrekt ab", () => {
    expect(getLocalDateKey("2025-04-10T21:59:59.000Z", "Europe/Zurich")).toBe(
      "2025-04-10",
    );
    expect(getLocalDateKey("2025-04-10T22:00:00.000Z", "Europe/Zurich")).toBe(
      "2025-04-11",
    );
    expect(isInLocalDay("2025-04-10T22:00:00.000Z", "2025-04-11", "Europe/Zurich")).toBe(
      true,
    );
  });

  it("erkennt den 23-Stunden-Tag beim Beginn der Sommerzeit", () => {
    const range = getLocalDayRange("2025-03-30", "Europe/Zurich");
    expect(range.start.toISOString()).toBe("2025-03-29T23:00:00.000Z");
    expect(range.end.toISOString()).toBe("2025-03-30T22:00:00.000Z");
    expect(range.durationMs).toBe(23 * 60 * 60 * 1_000);
  });

  it("erkennt den 25-Stunden-Tag beim Ende der Sommerzeit", () => {
    const range = getLocalDayRange("2025-10-26", "Europe/Zurich");
    expect(range.start.toISOString()).toBe("2025-10-25T22:00:00.000Z");
    expect(range.end.toISOString()).toBe("2025-10-26T23:00:00.000Z");
    expect(range.durationMs).toBe(25 * 60 * 60 * 1_000);
  });

  it("behält bei Reisen die beim Start verwendete Zeitzone bei", () => {
    const instant = "2025-01-01T02:00:00.000Z";
    expect(sessionLocalDate(instant, "Europe/Zurich")).toBe("2025-01-01");
    expect(sessionLocalDate(instant, "America/New_York")).toBe("2024-12-31");
  });

  it("unterstützt eine optionale Planungsgrenze nach Mitternacht", () => {
    expect(getLocalDateKey("2025-04-11T01:00:00.000Z", "Europe/Zurich", 240)).toBe(
      "2025-04-10",
    );
    expect(getLocalDateKey("2025-04-11T02:00:00.000Z", "Europe/Zurich", 240)).toBe(
      "2025-04-11",
    );
  });

  it("konvertiert lokale Uhrzeiten und Wochenstarts deterministisch", () => {
    expect(zonedDateTimeToInstant("2025-07-20", "08:30", "Europe/Zurich").toISOString()).toBe(
      "2025-07-20T06:30:00.000Z",
    );
    expect(startOfLocalWeek("2025-07-20T12:00:00.000Z", "Europe/Zurich")).toBe(
      "2025-07-14",
    );
  });
});
