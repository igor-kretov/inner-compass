import { LocalDateSchema, LocalTimeSchema } from "@/domain/entities";

export interface ZonedDateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function asDate(value: Date | string | number): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError("Ungültiger Zeitpunkt.");
  return date;
}

function formatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-CA-u-ca-iso8601", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
}

export function getZonedDateTimeParts(
  value: Date | string | number,
  timeZone: string,
): ZonedDateTimeParts {
  const values: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const part of formatter(timeZone).formatToParts(asDate(value))) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour) % 24,
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function formatDateKey(parts: Pick<ZonedDateTimeParts, "year" | "month" | "day">): string {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(
    2,
    "0",
  )}-${String(parts.day).padStart(2, "0")}`;
}

export function addLocalDays(localDate: string, days: number): string {
  LocalDateSchema.parse(localDate);
  if (!Number.isInteger(days)) throw new RangeError("days muss ganzzahlig sein.");
  const [year, month, day] = localDate.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return formatDateKey({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  });
}

/**
 * Returns the calendar date in the supplied IANA zone. A custom boundary can
 * assign the hours after midnight to the previous planning day without ever
 * changing the UTC timestamp stored on an entity.
 */
export function getLocalDateKey(
  value: Date | string | number,
  timeZone: string,
  dayBoundaryMinutes = 0,
): string {
  if (!Number.isInteger(dayBoundaryMinutes) || dayBoundaryMinutes < 0 || dayBoundaryMinutes >= 1_440) {
    throw new RangeError("dayBoundaryMinutes muss zwischen 0 und 1439 liegen.");
  }
  const parts = getZonedDateTimeParts(value, timeZone);
  const dateKey = formatDateKey(parts);
  const minutes = parts.hour * 60 + parts.minute;
  return minutes < dayBoundaryMinutes ? addLocalDays(dateKey, -1) : dateKey;
}

export function zonedDateTimeToInstant(
  localDate: string,
  localTime: string,
  timeZone: string,
): Date {
  LocalDateSchema.parse(localDate);
  LocalTimeSchema.parse(localTime);
  // This also verifies the zone before the iterative conversion starts.
  formatter(timeZone);

  const [year, month, day] = localDate.split("-").map(Number);
  const [hour, minute] = localTime.split(":").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let guess = target;

  // Intl exposes zoned fields, but not the inverse operation. Iteratively
  // correcting the wall-clock delta is reliable for normal times and day
  // boundaries, including 23/25-hour DST days.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const observed = getZonedDateTimeParts(guess, timeZone);
    const observedAsUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
      0,
      0,
    );
    const correction = target - observedAsUtc;
    if (correction === 0) return new Date(guess);
    guess += correction;
  }

  const finalParts = getZonedDateTimeParts(guess, timeZone);
  if (
    finalParts.year !== year ||
    finalParts.month !== month ||
    finalParts.day !== day ||
    finalParts.hour !== hour ||
    finalParts.minute !== minute
  ) {
    throw new RangeError(
      `Die lokale Zeit ${localDate} ${localTime} existiert in ${timeZone} nicht eindeutig.`,
    );
  }
  return new Date(guess);
}

export interface LocalDayRange {
  localDate: string;
  timeZone: string;
  start: Date;
  end: Date;
  durationMs: number;
}

export function getLocalDayRange(localDate: string, timeZone: string): LocalDayRange {
  const start = zonedDateTimeToInstant(localDate, "00:00", timeZone);
  const end = zonedDateTimeToInstant(addLocalDays(localDate, 1), "00:00", timeZone);
  return {
    localDate,
    timeZone,
    start,
    end,
    durationMs: end.getTime() - start.getTime(),
  };
}

export function isInLocalDay(
  value: Date | string | number,
  localDate: string,
  timeZone: string,
): boolean {
  const instant = asDate(value).getTime();
  const { start, end } = getLocalDayRange(localDate, timeZone);
  return instant >= start.getTime() && instant < end.getTime();
}

export function startOfLocalWeek(
  value: Date | string | number,
  timeZone: string,
  weekStartsOn: 0 | 1 = 1,
): string {
  const localDate = getLocalDateKey(value, timeZone);
  const [year, month, day] = localDate.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const daysSinceStart = (weekday - weekStartsOn + 7) % 7;
  return addLocalDays(localDate, -daysSinceStart);
}

/** Sessions belong to the local date on which they started, even if they cross midnight. */
export function sessionLocalDate(startedAt: string, timeZone: string): string {
  return getLocalDateKey(startedAt, timeZone);
}
