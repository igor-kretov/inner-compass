import { describe, expect, it } from "vitest";

import { createDefaultSettings } from "@/domain/factories";
import { emptyDataStore } from "@/domain/entities";

import {
  applyDataImport,
  createDataExport,
  mergeDataStores,
  migrateExportEnvelope,
  parseDataImport,
  serializeDataExport,
} from "./data-transfer";
import { createRepository } from "./db/repository";

const ID = "00000000-0000-4000-8000-000000000001";
const PLANNER_ID = {
  routine: "00000000-0000-4000-8000-000000000010",
  routineStep: "00000000-0000-4000-8000-000000000011",
  routineInstance: "00000000-0000-4000-8000-000000000012",
  routineInstanceStep: "00000000-0000-4000-8000-000000000013",
  weekPlan: "00000000-0000-4000-8000-000000000014",
  outcome: "00000000-0000-4000-8000-000000000015",
  backlog: "00000000-0000-4000-8000-000000000016",
};
const EARLIER = new Date("2025-04-10T10:00:00.000Z");
const LATER = new Date("2025-04-10T11:00:00.000Z");

function plannerData() {
  const data = emptyDataStore();
  const metadata = {
    createdAt: EARLIER.toISOString(),
    updatedAt: LATER.toISOString(),
    timeZone: "Europe/Zurich",
    schemaVersion: 2 as const,
  };
  data.routines.push({
    ...metadata,
    id: PLANNER_ID.routine,
    title: "Morgenroutine",
    weekdays: [1, 2, 3, 4, 5],
    daySegment: "morning",
    scheduledTime: "07:15",
    steps: [{ id: PLANNER_ID.routineStep, label: "Wasser trinken", order: 0 }],
    active: true,
    archivedAt: null,
  });
  data.routineInstances.push({
    ...metadata,
    id: PLANNER_ID.routineInstance,
    routineId: PLANNER_ID.routine,
    localDate: "2025-04-10",
    routineTitle: "Morgenroutine",
    daySegment: "morning",
    scheduledTime: "07:15",
    sourceRoutineUpdatedAt: LATER.toISOString(),
    steps: [
      {
        id: PLANNER_ID.routineInstanceStep,
        routineStepId: PLANNER_ID.routineStep,
        label: "Wasser trinken",
        order: 0,
        completedAt: LATER.toISOString(),
      },
    ],
    status: "completed",
    completedAt: LATER.toISOString(),
    skippedAt: null,
  });
  data.weekPlans.push({
    ...metadata,
    id: PLANNER_ID.weekPlan,
    weekStartDate: "2025-04-07",
    focus: "Konzept fertigstellen",
    outcomes: [
      {
        id: PLANNER_ID.outcome,
        title: "Entwurf teilen",
        status: "completed",
        scheduledDate: null,
        completedAt: LATER.toISOString(),
      },
    ],
    backlog: [
      {
        id: PLANNER_ID.backlog,
        title: "Recherche sortieren",
        status: "scheduled",
        scheduledDate: "2025-04-11",
        completedAt: null,
      },
    ],
  });
  return data;
}

describe("Datenexport und -import", () => {
  it("erstellt einen lesbaren, versionierten und wieder importierbaren Export", () => {
    const data = emptyDataStore();
    data.appSettings.push(
      createDefaultSettings({ id: ID, now: EARLIER, timeZone: "Europe/Zurich" }),
    );
    const envelope = createDataExport(data, { now: LATER, appVersion: "0.1.0" });
    const serialized = serializeDataExport(envelope);
    expect(serialized).toContain("\n  \"format\"");
    expect(parseDataImport(serialized)).toEqual(envelope);
  });

  it("exportiert und importiert Routinen, Tagesinstanzen und Wochenpläne verlustfrei", () => {
    const data = plannerData();
    const envelope = createDataExport(data, { now: LATER, appVersion: "0.1.0" });
    const imported = parseDataImport(serializeDataExport(envelope));

    expect(imported.data.routines).toEqual(data.routines);
    expect(imported.data.routineInstances).toEqual(data.routineInstances);
    expect(imported.data.weekPlans).toEqual(data.weekPlans);

    const merged = mergeDataStores(emptyDataStore(), imported.data);
    expect(merged.collections.routines).toMatchObject({ added: 1, total: 1 });
    expect(merged.collections.routineInstances).toMatchObject({ added: 1, total: 1 });
    expect(merged.collections.weekPlans).toMatchObject({ added: 1, total: 1 });
  });

  it("lädt ältere Exporte der Version 2 ohne Planner-Collections mit leeren Standardwerten", () => {
    const current = createDataExport(emptyDataStore(), { now: EARLIER });
    const previousData = { ...current.data } as Partial<typeof current.data>;
    delete previousData.routines;
    delete previousData.routineInstances;
    delete previousData.weekPlans;

    const imported = parseDataImport({ ...current, data: previousData });
    expect(imported.data).toMatchObject({
      routines: [],
      routineInstances: [],
      weekPlans: [],
    });
  });

  it("weist ungültiges JSON, unbekannte Felder und zu große Dateien verständlich ab", () => {
    expect(() => parseDataImport("{")).toThrowError(
      expect.objectContaining({ code: "invalid-json" }),
    );

    const invalid = createDataExport(emptyDataStore(), { now: EARLIER }) as unknown as Record<
      string,
      unknown
    >;
    invalid.secretBrowserDump = "nicht erlaubt";
    expect(() => parseDataImport(invalid)).toThrowError(
      expect.objectContaining({ code: "invalid-schema" }),
    );

    expect(() => parseDataImport("123456", { maxBytes: 5 })).toThrowError(
      expect.objectContaining({ code: "file-too-large" }),
    );
  });

  it("migriert einen Export der Schema-Version 1 und ergänzt die neue Zeitzonenform", () => {
    const migrated = migrateExportEnvelope({
      format: "inner-compass",
      exportVersion: 1,
      schemaVersion: 1,
      exportedAt: EARLIER.toISOString(),
      timeZone: "Europe/Zurich",
      data: {
        appSettings: [
          {
            id: ID,
            createdAt: EARLIER.toISOString(),
            updatedAt: EARLIER.toISOString(),
            timezone: "Europe/Zurich",
            schemaVersion: 1,
            displayName: "Igor",
          },
        ],
      },
    });
    expect(migrated.exportVersion).toBe(2);
    expect(migrated.data.appSettings[0]).toMatchObject({
      id: ID,
      schemaVersion: 2,
      timeZone: "Europe/Zurich",
      displayName: "Igor",
      defaultFocusMinutes: 50,
    });
  });
});

describe("Zusammenführen und Duplikaterkennung", () => {
  it("behält pro stabiler ID die zuletzt aktualisierte Version", () => {
    const existing = emptyDataStore();
    existing.appSettings.push(
      createDefaultSettings({ id: ID, now: EARLIER, timeZone: "Europe/Zurich" }),
    );
    const incoming = emptyDataStore();
    incoming.appSettings.push({
      ...createDefaultSettings({ id: ID, now: LATER, timeZone: "Europe/Zurich" }),
      displayName: "Neu",
    });

    const result = mergeDataStores(existing, incoming);
    expect(result.data.appSettings).toHaveLength(1);
    expect(result.data.appSettings[0].displayName).toBe("Neu");
    expect(result).toMatchObject({ added: 0, updated: 1, skipped: 0 });
  });

  it("überspringt ältere Duplikate und fügt neue IDs hinzu", () => {
    const existing = emptyDataStore();
    existing.appSettings.push(
      createDefaultSettings({ id: ID, now: LATER, timeZone: "Europe/Zurich" }),
    );
    const incoming = emptyDataStore();
    incoming.appSettings.push(
      createDefaultSettings({ id: ID, now: EARLIER, timeZone: "Europe/Zurich" }),
      createDefaultSettings({
        id: "00000000-0000-4000-8000-000000000002",
        now: LATER,
        timeZone: "Europe/Zurich",
      }),
    );

    const result = mergeDataStores(existing, incoming);
    expect(result.data.appSettings).toHaveLength(2);
    expect(result).toMatchObject({ added: 1, updated: 0, skipped: 1 });
  });

  it("schreibt einen validierten Merge erst nach ausdrücklicher Bestätigung", async () => {
    const repository = createRepository({ forceBackend: "memory" });
    await repository.put(
      "appSettings",
      createDefaultSettings({ id: ID, now: EARLIER, timeZone: "Europe/Zurich" }),
    );
    const imported = emptyDataStore();
    imported.appSettings.push({
      ...createDefaultSettings({ id: ID, now: LATER, timeZone: "Europe/Zurich" }),
      displayName: "Aus Sicherung",
    });
    const serialized = serializeDataExport(createDataExport(imported, { now: LATER }));

    await expect(
      applyDataImport(repository, serialized, { mode: "merge", confirmed: false }),
    ).rejects.toMatchObject({ code: "confirmation-required" });
    expect((await repository.get("appSettings", ID))?.displayName).toBeUndefined();

    const result = await applyDataImport(repository, serialized, {
      mode: "merge",
      confirmed: true,
    });
    expect(result.updated).toBe(1);
    expect((await repository.get("appSettings", ID))?.displayName).toBe("Aus Sicherung");
    await repository.close();
  });
});
