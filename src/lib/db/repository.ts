import Dexie, { type Table } from "dexie";

import {
  COLLECTION_NAMES,
  DataStoreSchema,
  EntitySchemas,
  emptyDataStore,
  type CollectionName,
  type CollectionTypes,
  type DataStore,
} from "@/domain/entities";

export const DATABASE_NAME = "inner-compass";
export const DATABASE_VERSION = 3;
export const LOCAL_STORAGE_KEY = "inner-compass:data:v2";

export type StorageBackendKind = "indexedDB" | "localStorage" | "memory";

export interface InnerCompassRepository {
  get<K extends CollectionName>(
    collection: K,
    id: string,
  ): Promise<CollectionTypes[K] | undefined>;
  getAll<K extends CollectionName>(collection: K): Promise<CollectionTypes[K][]>;
  list<K extends CollectionName>(collection: K): Promise<CollectionTypes[K][]>;
  put<K extends CollectionName>(
    collection: K,
    entity: CollectionTypes[K],
  ): Promise<CollectionTypes[K]>;
  save<K extends CollectionName>(
    collection: K,
    entity: CollectionTypes[K],
  ): Promise<CollectionTypes[K]>;
  bulkPut<K extends CollectionName>(
    collection: K,
    entities: readonly CollectionTypes[K][],
  ): Promise<void>;
  delete<K extends CollectionName>(collection: K, id: string): Promise<boolean>;
  clear(collection: CollectionName): Promise<void>;
  clearAll(): Promise<void>;
  exportData(): Promise<DataStore>;
  replaceAll(data: DataStore): Promise<void>;
  backendKind(): Promise<StorageBackendKind>;
  close(): Promise<void>;
}

interface StorageBackend extends Omit<InnerCompassRepository, "list" | "save" | "backendKind"> {
  readonly kind: StorageBackendKind;
}

function clone<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") return globalThis.structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function validate<K extends CollectionName>(
  collection: K,
  entity: CollectionTypes[K],
): CollectionTypes[K] {
  return EntitySchemas[collection].parse(entity) as CollectionTypes[K];
}

function valuesFor<K extends CollectionName>(
  data: DataStore,
  collection: K,
): CollectionTypes[K][] {
  return data[collection] as CollectionTypes[K][];
}

class MemoryBackend implements StorageBackend {
  readonly kind = "memory" as const;
  private data: DataStore;

  constructor(seed: DataStore = emptyDataStore()) {
    this.data = clone(DataStoreSchema.parse(seed));
  }

  async get<K extends CollectionName>(collection: K, id: string) {
    const found = valuesFor(this.data, collection).find((entity) => entity.id === id);
    return found ? clone(found) : undefined;
  }

  async getAll<K extends CollectionName>(collection: K) {
    return clone(valuesFor(this.data, collection));
  }

  async put<K extends CollectionName>(collection: K, entity: CollectionTypes[K]) {
    const parsed = validate(collection, entity);
    const values = valuesFor(this.data, collection);
    const index = values.findIndex((item) => item.id === parsed.id);
    if (index === -1) values.push(clone(parsed));
    else values[index] = clone(parsed);
    return clone(parsed);
  }

  async bulkPut<K extends CollectionName>(
    collection: K,
    entities: readonly CollectionTypes[K][],
  ) {
    for (const entity of entities) await this.put(collection, entity);
  }

  async delete<K extends CollectionName>(collection: K, id: string) {
    const values = valuesFor(this.data, collection);
    const index = values.findIndex((entity) => entity.id === id);
    if (index === -1) return false;
    values.splice(index, 1);
    return true;
  }

  async clear(collection: CollectionName) {
    (this.data[collection] as unknown[]).splice(0);
  }

  async clearAll() {
    this.data = emptyDataStore();
  }

  async exportData() {
    return clone(this.data);
  }

  async replaceAll(data: DataStore) {
    this.data = clone(DataStoreSchema.parse(data));
  }

  async close() {}
}

class WebStorageBackend implements StorageBackend {
  readonly kind = "localStorage" as const;

  constructor(
    private readonly storage: Storage,
    private readonly key: string,
  ) {}

  private read(): DataStore {
    const stored = this.storage.getItem(this.key);
    if (stored === null) return emptyDataStore();
    return DataStoreSchema.parse(JSON.parse(stored) as unknown);
  }

  private write(data: DataStore): void {
    this.storage.setItem(this.key, JSON.stringify(DataStoreSchema.parse(data)));
  }

  async get<K extends CollectionName>(collection: K, id: string) {
    const found = valuesFor(this.read(), collection).find((entity) => entity.id === id);
    return found ? clone(found) : undefined;
  }

  async getAll<K extends CollectionName>(collection: K) {
    return clone(valuesFor(this.read(), collection));
  }

  async put<K extends CollectionName>(collection: K, entity: CollectionTypes[K]) {
    const parsed = validate(collection, entity);
    const data = this.read();
    const values = valuesFor(data, collection);
    const index = values.findIndex((item) => item.id === parsed.id);
    if (index === -1) values.push(clone(parsed));
    else values[index] = clone(parsed);
    this.write(data);
    return clone(parsed);
  }

  async bulkPut<K extends CollectionName>(
    collection: K,
    entities: readonly CollectionTypes[K][],
  ) {
    const data = this.read();
    const values = valuesFor(data, collection);
    for (const entity of entities) {
      const parsed = validate(collection, entity);
      const index = values.findIndex((item) => item.id === parsed.id);
      if (index === -1) values.push(clone(parsed));
      else values[index] = clone(parsed);
    }
    this.write(data);
  }

  async delete<K extends CollectionName>(collection: K, id: string) {
    const data = this.read();
    const values = valuesFor(data, collection);
    const index = values.findIndex((entity) => entity.id === id);
    if (index === -1) return false;
    values.splice(index, 1);
    this.write(data);
    return true;
  }

  async clear(collection: CollectionName) {
    const data = this.read();
    (data[collection] as unknown[]).splice(0);
    this.write(data);
  }

  async clearAll() {
    this.storage.removeItem(this.key);
  }

  async exportData() {
    return clone(this.read());
  }

  async replaceAll(data: DataStore) {
    this.write(clone(DataStoreSchema.parse(data)));
  }

  async close() {}
}

// Keep the historical store map separate: Dexie runs each version declaration
// while upgrading an existing database, so version 2 must not try to touch the
// planner tables that are only introduced in version 3.
const dexieStoresV2 = {
  appSettings: "&id, updatedAt",
  onboardingStates: "&id, updatedAt",
  dailyPlans: "&id, [localDate+timeZone], localDate, updatedAt",
  dailyTasks: "&id, dailyPlanId, [dailyPlanId+role], updatedAt",
  focusSessions: "&id, localDate, status, startedAt, endedAt, updatedAt",
  meditationSessions: "&id, localDate, status, startedAt, endedAt, updatedAt",
  resetSessions: "&id, localDate, completedAt, updatedAt",
  dailyReflections: "&id, [localDate+timeZone], localDate, updatedAt",
  weeklyReviews: "&id, [weekStartDate+timeZone], weekStartDate, updatedAt",
  patternEntries: "&id, localDate, occurredAt, trigger, chosenAction, updatedAt",
  emergencyContacts: "&id, updatedAt",
};

const dexieStores: Record<CollectionName, string> = {
  ...dexieStoresV2,
  dailyTasks:
    "&id, dailyPlanId, [dailyPlanId+role], daySegment, status, updatedAt",
  routines: "&id, active, daySegment, updatedAt",
  routineInstances:
    "&id, routineId, [routineId+localDate+timeZone], localDate, daySegment, status, updatedAt",
  weekPlans: "&id, [weekStartDate+timeZone], weekStartDate, updatedAt",
};

class InnerCompassDexie extends Dexie {
  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores(dexieStoresV2);
    this.version(2)
      .stores(dexieStoresV2)
      .upgrade(async (transaction) => {
        for (const collection of Object.keys(dexieStoresV2)) {
          await transaction
            .table(collection)
            .toCollection()
            .modify((record: Record<string, unknown>) => {
              if (record.schemaVersion === 1) record.schemaVersion = 2;
            });
        }
      });
    this.version(DATABASE_VERSION).stores(dexieStores);
  }
}

class DexieBackend implements StorageBackend {
  readonly kind = "indexedDB" as const;

  constructor(private readonly database: InnerCompassDexie) {}

  static async open(databaseName: string): Promise<DexieBackend> {
    const database = new InnerCompassDexie(databaseName);
    await database.open();
    return new DexieBackend(database);
  }

  private table<K extends CollectionName>(collection: K): Table<CollectionTypes[K], string> {
    return this.database.table<CollectionTypes[K], string>(collection);
  }

  private transaction<T>(mode: "r" | "rw", operation: () => Promise<T>): Promise<T> {
    const run = this.database.transaction.bind(this.database) as unknown as (
      transactionMode: "r" | "rw",
      tables: Table[],
      scope: () => Promise<T>,
    ) => Promise<T>;
    return run(mode, COLLECTION_NAMES.map((name) => this.database.table(name)), operation);
  }

  async get<K extends CollectionName>(collection: K, id: string) {
    const entity = await this.table(collection).get(id);
    return entity ? clone(validate(collection, entity)) : undefined;
  }

  async getAll<K extends CollectionName>(collection: K) {
    const entities = await this.table(collection).toArray();
    return entities.map((entity) => clone(validate(collection, entity)));
  }

  async put<K extends CollectionName>(collection: K, entity: CollectionTypes[K]) {
    const parsed = validate(collection, entity);
    await this.table(collection).put(clone(parsed));
    return clone(parsed);
  }

  async bulkPut<K extends CollectionName>(
    collection: K,
    entities: readonly CollectionTypes[K][],
  ) {
    const parsed = entities.map((entity) => clone(validate(collection, entity)));
    await this.table(collection).bulkPut(parsed);
  }

  async delete<K extends CollectionName>(collection: K, id: string) {
    const table = this.table(collection);
    if ((await table.get(id)) === undefined) return false;
    await table.delete(id);
    return true;
  }

  async clear(collection: CollectionName) {
    await this.table(collection).clear();
  }

  async clearAll() {
    await this.transaction("rw", async () => {
      for (const collection of COLLECTION_NAMES) await this.table(collection).clear();
    });
  }

  async exportData(): Promise<DataStore> {
    const data = emptyDataStore();
    await this.transaction("r", async () => {
      for (const collection of COLLECTION_NAMES) {
        const entities = await this.table(collection).toArray();
        (data[collection] as unknown[]).push(
          ...entities.map((entity) => clone(validate(collection, entity))),
        );
      }
    });
    return DataStoreSchema.parse(data);
  }

  async replaceAll(data: DataStore) {
    const parsed = DataStoreSchema.parse(data);
    await this.transaction("rw", async () => {
      for (const collection of COLLECTION_NAMES) {
        const table = this.table(collection);
        await table.clear();
        const entities = parsed[collection] as CollectionTypes[typeof collection][];
        if (entities.length > 0) await table.bulkPut(entities);
      }
    });
  }

  async close() {
    this.database.close();
  }
}

export interface RepositoryOptions {
  databaseName?: string;
  localStorageKey?: string;
  forceBackend?: StorageBackendKind;
  storage?: Storage | null;
}

function availableLocalStorage(explicitStorage?: Storage | null): Storage | null {
  try {
    const storage = explicitStorage === undefined ? globalThis.localStorage : explicitStorage;
    if (!storage) return null;
    const probeKey = `${LOCAL_STORAGE_KEY}:probe`;
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
}

class ResilientRepository implements InnerCompassRepository {
  private backendPromise: Promise<StorageBackend> | null = null;
  private backend: StorageBackend | null = null;

  constructor(private readonly options: RepositoryOptions) {}

  private localOrMemory(): StorageBackend {
    if (this.options.forceBackend === "memory") return new MemoryBackend();
    const storage = availableLocalStorage(this.options.storage);
    return storage
      ? new WebStorageBackend(storage, this.options.localStorageKey ?? LOCAL_STORAGE_KEY)
      : new MemoryBackend();
  }

  private async chooseBackend(): Promise<StorageBackend> {
    if (this.options.forceBackend === "memory" || this.options.forceBackend === "localStorage") {
      return this.localOrMemory();
    }
    if (typeof globalThis.indexedDB !== "undefined") {
      try {
        return await DexieBackend.open(this.options.databaseName ?? DATABASE_NAME);
      } catch {
        return this.localOrMemory();
      }
    }
    return this.localOrMemory();
  }

  private async currentBackend(): Promise<StorageBackend> {
    if (this.backend) return this.backend;
    this.backendPromise ??= this.chooseBackend();
    this.backend = await this.backendPromise;
    return this.backend;
  }

  private async fallbackAfterFailure(failed: StorageBackend): Promise<StorageBackend> {
    await failed.close().catch(() => undefined);
    const fallback = failed.kind === "indexedDB" ? this.localOrMemory() : new MemoryBackend();
    this.backend = fallback;
    this.backendPromise = Promise.resolve(fallback);
    return fallback;
  }

  private async run<T>(operation: (backend: StorageBackend) => Promise<T>): Promise<T> {
    const backend = await this.currentBackend();
    try {
      return await operation(backend);
    } catch {
      const fallback = await this.fallbackAfterFailure(backend);
      return operation(fallback);
    }
  }

  get<K extends CollectionName>(collection: K, id: string) {
    return this.run((backend) => backend.get(collection, id));
  }

  getAll<K extends CollectionName>(collection: K) {
    return this.run((backend) => backend.getAll(collection));
  }

  list<K extends CollectionName>(collection: K) {
    return this.getAll(collection);
  }

  put<K extends CollectionName>(collection: K, entity: CollectionTypes[K]) {
    return this.run((backend) => backend.put(collection, entity));
  }

  save<K extends CollectionName>(collection: K, entity: CollectionTypes[K]) {
    return this.put(collection, entity);
  }

  bulkPut<K extends CollectionName>(
    collection: K,
    entities: readonly CollectionTypes[K][],
  ) {
    return this.run((backend) => backend.bulkPut(collection, entities));
  }

  delete<K extends CollectionName>(collection: K, id: string) {
    return this.run((backend) => backend.delete(collection, id));
  }

  clear(collection: CollectionName) {
    return this.run((backend) => backend.clear(collection));
  }

  clearAll() {
    return this.run((backend) => backend.clearAll());
  }

  exportData() {
    return this.run((backend) => backend.exportData());
  }

  replaceAll(data: DataStore) {
    return this.run((backend) => backend.replaceAll(data));
  }

  async backendKind() {
    return (await this.currentBackend()).kind;
  }

  async close() {
    if (this.backend) await this.backend.close();
    this.backend = null;
    this.backendPromise = null;
  }
}

export function createRepository(options: RepositoryOptions = {}): InnerCompassRepository {
  return new ResilientRepository(options);
}

/** Lazy singleton for the browser app. Tests should create isolated repositories. */
export const innerCompassRepository = createRepository();
