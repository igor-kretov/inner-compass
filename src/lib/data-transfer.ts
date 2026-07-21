import { z } from "zod";

import {
  COLLECTION_NAMES,
  DataExportEnvelopeSchema,
  DataStoreSchema,
  ENTITY_SCHEMA_VERSION,
  EXPORT_FORMAT_VERSION,
  EntitySchemas,
  emptyDataStore,
  type CollectionName,
  type CollectionTypes,
  type DataExportEnvelope,
  type DataStore,
} from "@/domain/entities";
import { systemTimeZone } from "@/domain/factories";
import { getLocalDateKey } from "@/lib/dates";
import type { InnerCompassRepository } from "@/lib/db/repository";
import {
  LegacyUiExportEnvelopeSchema,
  legacyAppStateToDataStore,
} from "@/lib/legacy-app-state";

export const DEFAULT_MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export type DataImportErrorCode =
  | "file-too-large"
  | "invalid-json"
  | "invalid-schema"
  | "unsupported-version"
  | "confirmation-required";

export class DataImportError extends Error {
  constructor(
    readonly code: DataImportErrorCode,
    message: string,
    readonly issues: readonly string[] = [],
  ) {
    super(message);
    this.name = "DataImportError";
  }
}

const legacyRecordSchema = z.record(z.string(), z.unknown());
const legacyDataShape = Object.fromEntries(
  COLLECTION_NAMES.map((collection) => [collection, z.array(legacyRecordSchema).default([])]),
) as Record<CollectionName, z.ZodDefault<z.ZodArray<typeof legacyRecordSchema>>>;

const LegacyExportEnvelopeSchema = z
  .object({
    format: z.literal("inner-compass"),
    exportVersion: z.literal(1),
    schemaVersion: z.literal(1),
    exportedAt: z.string().datetime({ offset: true }),
    appVersion: z.string().trim().max(40).optional(),
    timeZone: z.string().max(100).optional(),
    data: z.object(legacyDataShape).strict(),
  })
  .strict();

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function migrationDate(record: Record<string, unknown>, timeZone: string): string | undefined {
  if (typeof record.localDate === "string") return record.localDate;
  const source =
    typeof record.startedAt === "string"
      ? record.startedAt
      : typeof record.occurredAt === "string"
        ? record.occurredAt
        : typeof record.createdAt === "string"
          ? record.createdAt
          : undefined;
  if (!source) return undefined;
  try {
    return getLocalDateKey(source, timeZone);
  } catch {
    return undefined;
  }
}

function migrateLegacyRecord<K extends CollectionName>(
  collection: K,
  source: Record<string, unknown>,
  fallbackTimeZone: string,
): CollectionTypes[K] {
  const record = { ...source };
  const legacyZone = typeof record.timezone === "string" ? record.timezone : undefined;
  delete record.timezone;
  const timeZone =
    typeof record.timeZone === "string" ? record.timeZone : legacyZone ?? fallbackTimeZone;
  record.timeZone = timeZone;
  record.schemaVersion = ENTITY_SCHEMA_VERSION;

  if (
    [
      "dailyPlans",
      "focusSessions",
      "meditationSessions",
      "resetSessions",
      "dailyReflections",
      "patternEntries",
    ].includes(collection) &&
    typeof record.localDate !== "string"
  ) {
    record.localDate = migrationDate(record, timeZone);
  }

  return EntitySchemas[collection].parse(record) as CollectionTypes[K];
}

export function migrateExportEnvelope(input: unknown): DataExportEnvelope {
  const current = DataExportEnvelopeSchema.safeParse(input);
  if (current.success) return current.data;

  const legacyUiSnapshot = LegacyUiExportEnvelopeSchema.safeParse(input);
  if (legacyUiSnapshot.success) {
    return DataExportEnvelopeSchema.parse({
      format: "inner-compass",
      exportVersion: EXPORT_FORMAT_VERSION,
      schemaVersion: ENTITY_SCHEMA_VERSION,
      exportedAt: legacyUiSnapshot.data.exportedAt,
      data: legacyAppStateToDataStore(legacyUiSnapshot.data.data),
    });
  }

  if (
    typeof input === "object" &&
    input !== null &&
    (input as Record<string, unknown>).format === "inner-compass-export"
  ) {
    throw new DataImportError(
      "invalid-schema",
      "Der ältere Inner-Compass-Export enthält ungültige oder unvollständige Daten.",
      legacyUiSnapshot.error.issues.map((issue) => issue.path.join(".") || "Datei"),
    );
  }

  if (typeof input === "object" && input !== null) {
    const version = (input as Record<string, unknown>).exportVersion;
    if (typeof version === "number" && version > EXPORT_FORMAT_VERSION) {
      throw new DataImportError(
        "unsupported-version",
        "Diese Exportdatei stammt aus einer neueren App-Version.",
      );
    }
  }

  const legacy = LegacyExportEnvelopeSchema.safeParse(input);
  if (!legacy.success) {
    throw new DataImportError(
      "invalid-schema",
      "Die Datei hat kein gültiges Inner-Compass-Datenformat.",
      legacy.error.issues.map((issue) => issue.path.join(".") || "Datei"),
    );
  }

  const fallbackTimeZone = legacy.data.timeZone ?? systemTimeZone();
  const migrated = emptyDataStore();
  for (const collection of COLLECTION_NAMES) {
    const records = legacy.data.data[collection];
    (migrated[collection] as unknown[]).push(
      ...records.map((record) => migrateLegacyRecord(collection, record, fallbackTimeZone)),
    );
  }

  return DataExportEnvelopeSchema.parse({
    format: "inner-compass",
    exportVersion: EXPORT_FORMAT_VERSION,
    schemaVersion: ENTITY_SCHEMA_VERSION,
    exportedAt: legacy.data.exportedAt,
    appVersion: legacy.data.appVersion,
    data: migrated,
  });
}

export function parseDataImport(
  source: string | unknown,
  options: { maxBytes?: number } = {},
): DataExportEnvelope {
  let value: unknown = source;
  if (typeof source === "string") {
    if (byteLength(source) > (options.maxBytes ?? DEFAULT_MAX_IMPORT_BYTES)) {
      throw new DataImportError(
        "file-too-large",
        "Die Importdatei ist größer als die erlaubten 5 MB.",
      );
    }
    try {
      value = JSON.parse(source) as unknown;
    } catch {
      throw new DataImportError("invalid-json", "Die ausgewählte Datei enthält kein gültiges JSON.");
    }
  }

  try {
    return migrateExportEnvelope(value);
  } catch (error) {
    if (error instanceof DataImportError) throw error;
    if (error instanceof z.ZodError) {
      throw new DataImportError(
        "invalid-schema",
        "Die Datei enthält ungültige oder unvollständige Daten.",
        error.issues.map((issue) => issue.path.join(".") || "Datei"),
      );
    }
    throw new DataImportError("invalid-schema", "Die Datei konnte nicht sicher geprüft werden.");
  }
}

export function createDataExport(
  data: DataStore,
  options: { now?: Date; appVersion?: string } = {},
): DataExportEnvelope {
  return DataExportEnvelopeSchema.parse({
    format: "inner-compass",
    exportVersion: EXPORT_FORMAT_VERSION,
    schemaVersion: ENTITY_SCHEMA_VERSION,
    exportedAt: (options.now ?? new Date()).toISOString(),
    appVersion: options.appVersion,
    data: DataStoreSchema.parse(data),
  });
}

export function serializeDataExport(envelope: DataExportEnvelope): string {
  return JSON.stringify(DataExportEnvelopeSchema.parse(envelope), null, 2);
}

export async function exportRepository(
  repository: InnerCompassRepository,
  options: { now?: Date; appVersion?: string } = {},
): Promise<DataExportEnvelope> {
  return createDataExport(await repository.exportData(), options);
}

export interface CollectionMergeStats {
  added: number;
  updated: number;
  skipped: number;
  total: number;
}

export interface MergeResult {
  data: DataStore;
  collections: Record<CollectionName, CollectionMergeStats>;
  added: number;
  updated: number;
  skipped: number;
}

function newerThan(left: { updatedAt: string }, right: { updatedAt: string }): boolean {
  return new Date(left.updatedAt).getTime() > new Date(right.updatedAt).getTime();
}

function mergeCollection<K extends CollectionName>(
  collection: K,
  existing: readonly CollectionTypes[K][],
  incoming: readonly CollectionTypes[K][],
): { values: CollectionTypes[K][]; stats: CollectionMergeStats } {
  const byId = new Map<string, CollectionTypes[K]>();
  for (const entity of existing) {
    const parsed = EntitySchemas[collection].parse(entity) as CollectionTypes[K];
    const current = byId.get(parsed.id);
    if (!current || newerThan(parsed, current)) byId.set(parsed.id, parsed);
  }

  let added = 0;
  let updated = 0;
  let skipped = 0;
  for (const entity of incoming) {
    const parsed = EntitySchemas[collection].parse(entity) as CollectionTypes[K];
    const current = byId.get(parsed.id);
    if (!current) {
      byId.set(parsed.id, parsed);
      added += 1;
    } else if (newerThan(parsed, current)) {
      byId.set(parsed.id, parsed);
      updated += 1;
    } else {
      skipped += 1;
    }
  }

  const values = [...byId.values()].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime() ||
      left.id.localeCompare(right.id),
  );
  return { values, stats: { added, updated, skipped, total: values.length } };
}

export function mergeDataStores(existing: DataStore, incoming: DataStore): MergeResult {
  const left = DataStoreSchema.parse(existing);
  const right = DataStoreSchema.parse(incoming);
  const data = emptyDataStore();
  const collections = {} as Record<CollectionName, CollectionMergeStats>;

  for (const collection of COLLECTION_NAMES) {
    const result = mergeCollection(
      collection,
      left[collection] as CollectionTypes[typeof collection][],
      right[collection] as CollectionTypes[typeof collection][],
    );
    (data[collection] as unknown[]).push(...result.values);
    collections[collection] = result.stats;
  }

  return {
    data: DataStoreSchema.parse(data),
    collections,
    added: COLLECTION_NAMES.reduce((sum, name) => sum + collections[name].added, 0),
    updated: COLLECTION_NAMES.reduce((sum, name) => sum + collections[name].updated, 0),
    skipped: COLLECTION_NAMES.reduce((sum, name) => sum + collections[name].skipped, 0),
  };
}

export function previewDataImport(envelope: DataExportEnvelope): Record<CollectionName, number> {
  const parsed = DataExportEnvelopeSchema.parse(envelope);
  return Object.fromEntries(
    COLLECTION_NAMES.map((collection) => [collection, parsed.data[collection].length]),
  ) as Record<CollectionName, number>;
}

export type ImportMode = "replace" | "merge";

export async function applyDataImport(
  repository: InnerCompassRepository,
  source: string | unknown,
  options: { mode: ImportMode; confirmed: boolean; maxBytes?: number },
): Promise<MergeResult> {
  if (!options.confirmed) {
    throw new DataImportError(
      "confirmation-required",
      "Der Import muss vor dem Schreiben ausdrücklich bestätigt werden.",
    );
  }
  const envelope = parseDataImport(source, { maxBytes: options.maxBytes });
  const existing = await repository.exportData();
  const result =
    options.mode === "merge"
      ? mergeDataStores(existing, envelope.data)
      : mergeDataStores(emptyDataStore(), envelope.data);
  await repository.replaceAll(result.data);
  return result;
}
