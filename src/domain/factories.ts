import {
  AppSettingsSchema,
  DailyPlanSchema,
  ENTITY_SCHEMA_VERSION,
  OnboardingStateSchema,
  type AppSettings,
  type DailyPlan,
  type OnboardingState,
} from "./entities";

export interface EntityMetadata {
  id: string;
  createdAt: string;
  updatedAt: string;
  timeZone: string;
  schemaVersion: typeof ENTITY_SCHEMA_VERSION;
}

function fallbackUuid(): string {
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function createStableId(): string {
  return globalThis.crypto?.randomUUID?.() ?? fallbackUuid();
}

/**
 * Creates a UUID-shaped, deterministic local identifier for materialized
 * records such as one routine on one calendar day. It is not a content hash
 * or security primitive; its purpose is idempotent local generation.
 */
export function createNamespacedStableId(namespace: string, value: string): string {
  const input = `${namespace}:${value}`;
  const words = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    for (let word = 0; word < words.length; word += 1) {
      words[word] = Math.imul(words[word] ^ (code + word * 31), 0x01000193) >>> 0;
    }
  }
  const hex = words.map((word) => word.toString(16).padStart(8, "0")).join("").split("");
  hex[12] = "4";
  hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16], 16) % 4];
  const joined = hex.join("");
  return `${joined.slice(0, 8)}-${joined.slice(8, 12)}-${joined.slice(12, 16)}-${joined.slice(
    16,
    20,
  )}-${joined.slice(20)}`;
}

export function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function createEntityMetadata(options: {
  id?: string;
  now?: Date;
  timeZone?: string;
} = {}): EntityMetadata {
  const timestamp = (options.now ?? new Date()).toISOString();
  return {
    id: options.id ?? createStableId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    timeZone: options.timeZone ?? systemTimeZone(),
    schemaVersion: ENTITY_SCHEMA_VERSION,
  };
}

export function touchEntity<T extends EntityMetadata>(
  entity: T,
  now: Date = new Date(),
): T {
  return { ...entity, updatedAt: now.toISOString() };
}

export function createDefaultSettings(options: {
  id?: string;
  now?: Date;
  timeZone?: string;
} = {}): AppSettings {
  return AppSettingsSchema.parse({
    ...createEntityMetadata(options),
    weeklyReviewDay: 0,
    weeklyReviewTime: "18:00",
    defaultFocusMinutes: 50,
    theme: "system",
    timerSoundEnabled: true,
    hapticFeedbackEnabled: true,
    anchors: [],
    emergencyContactId: null,
  });
}

export function createOnboardingState(options: {
  id?: string;
  now?: Date;
  timeZone?: string;
  currentStep?: number;
} = {}): OnboardingState {
  return OnboardingStateSchema.parse({
    ...createEntityMetadata(options),
    currentStep: options.currentStep ?? 1,
    completed: false,
    completedAt: null,
  });
}

export function createDailyPlan(
  localDate: string,
  options: { id?: string; now?: Date; timeZone?: string } = {},
): DailyPlan {
  return DailyPlanSchema.parse({
    ...createEntityMetadata(options),
    localDate,
  });
}
