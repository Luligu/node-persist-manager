/**
 * @file src/nodeStorage.ts
 * @description This file contains the classes NodeStorageManager and NodeStorage
 * @author Luca Liguori
 * @created 2024-02-02
 * @version 2.0.0
 * @license Apache-2.0
 *
 * Copyright 2024, 2025, 2026 Luca Liguori.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* oxlint-disable no-console */
/* oxlint-disable typescript/no-unsafe-type-assertion */

import { rm } from 'node:fs/promises';
import path from 'node:path';

import { type DeleteFileResult, type InitOptions, SqliteStorage, type WriteFileResult } from './sqliteStorage.js';

export type { DeleteFileResult, InitOptions, WriteFileResult } from './sqliteStorage.js';

/**
 * Performs a health check on a storage instance.
 *
 * @param {SqliteStorage} storage - The storage instance to check.
 * @returns {Promise<boolean>} A promise that resolves with true if the storage is healthy, otherwise false.
 */
async function performHealthCheck(storage: SqliteStorage): Promise<boolean> {
  try {
    // Attempt to get data and keys, and access the first key
    const data = await storage.data();
    for (const datum of data) {
      if (!datum || typeof datum.key !== 'string') {
        if (storage.options.logging) console.error(`Health check failed for invalid data: ${JSON.stringify(datum)}`);
        return false; // Ensure datum is valid
      }
      await storage.getItem(datum.key); // Use getItem to ensure we can access the value
    }
    const keys = await storage.keys();
    if (keys.length !== data.length) return false; // Ensure keys match data length
    const values = await storage.values();
    if (values.length !== data.length) return false; // Ensure values match data length
    return true; // Storage is healthy
  } catch (error) {
    if (storage.options.logging) console.error('Health check failed:', error);
    return false; // Storage is not healthy
  }
}

export type NodeStorageKey = string;
export type NodeStorageValue = unknown;
export type NodeStorageName = string;

/**
 * Class responsible for managing multiple node storages.
 */
export class NodeStorageManager {
  private readonly storage: SqliteStorage;
  private readonly initOptions: InitOptions & { dir: string };
  private storageNames: NodeStorageName[] = [];
  // Weak references: the storages released by the caller can be garbage collected with their database
  private readonly openStorages = new Map<NodeStorageName, Set<WeakRef<SqliteStorage>>>();

  /**
   * Initializes a new instance of NodeStorageManager with optional initialization options.
   *
   * @param {InitOptions} [initOptions] - Optional initialization options to customize the storage.
   */
  constructor(initOptions?: InitOptions) {
    // Merge initOptions with default initOptions
    this.initOptions = Object.assign(
      {
        dir: path.join(process.cwd(), 'node_storage'),
        writeQueue: false,
        expiredInterval: undefined,
        logging: false,
      },
      initOptions,
    );

    // Create and initialize a new instance of SqliteStorage
    this.storage = new SqliteStorage(this.initOptions);
    if (this.initOptions.logging === true) {
      console.log(`Storage manager initialized with options ${JSON.stringify(this.initOptions)}`);
    }
  }

  /**
   * Closes the node storage manager by stopping the expired keys interval and closing the database.
   */
  // oxlint-disable-next-line typescript/require-await
  async close(): Promise<void> {
    this.storage.close();
  }

  /**
   * Creates and initializes a new storage with a given name.
   *
   * @param {string} storageName - The name of the new storage to create.
   * @returns {Promise<NodeStorage>} A promise that resolves to the newly created NodeStorage instance.
   */
  async createStorage(storageName: string): Promise<NodeStorage> {
    const initOptions = Object.assign({}, this.initOptions, { dir: path.join(this.initOptions.dir, '.' + storageName) });
    const storage = new SqliteStorage(initOptions);
    const openStorages = this.openStorages.get(storageName) ?? new Set<WeakRef<SqliteStorage>>();
    openStorages.forEach((ref) => {
      if (!ref.deref()) openStorages.delete(ref);
    });
    openStorages.add(new WeakRef(storage));
    this.openStorages.set(storageName, openStorages);

    // Update storageNames
    this.storageNames = ((await this.storage.getItem('storageNames')) as NodeStorageName[] | undefined) ?? [];
    if (!this.storageNames.includes(storageName)) {
      this.storageNames.push(storageName);
    }
    await this.storage.setItem('storageNames', this.storageNames);

    return new NodeStorage(storage, initOptions);
  }

  /**
   * Removes a storage by its name.
   *
   * The databases of the NodeStorage instances of this storage are closed before removing its directory.
   *
   * @param {string} storageName - The name of the storage to remove.
   * @returns {Promise<boolean>} A promise that resolves to true if the storage was successfully removed, otherwise false.
   */
  async removeStorage(storageName: string): Promise<boolean> {
    const dir = path.join(this.initOptions.dir, '.' + storageName);
    try {
      this.openStorages.get(storageName)?.forEach((ref) => ref.deref()?.close());
      this.openStorages.delete(storageName);
      await rm(dir, { recursive: true });

      // Update storageNames
      this.storageNames = ((await this.storage.getItem('storageNames')) as NodeStorageName[] | undefined) ?? [];
      const index = this.storageNames.indexOf(storageName);
      if (index > -1) {
        this.storageNames.splice(index, 1);
      }
      await this.storage.setItem('storageNames', this.storageNames);

      return true;
    } catch (_err) {
      return false;
    }
  }

  /**
   * Retrieves the names of all available storages.
   *
   * @returns {Promise<NodeStorageName[]>} A promise that resolves to an array of storage names.
   */
  async getStorageNames(): Promise<NodeStorageName[]> {
    this.storageNames = ((await this.storage.getItem('storageNames')) as NodeStorageName[] | undefined) ?? [];
    return this.storageNames;
  }

  /**
   * Retrieves the keys of the entries in the storage.
   *
   * @returns {Promise<number>} A promise that resolves with the keys of the entries in the storage.
   */
  async keys(): Promise<NodeStorageKey[]> {
    return this.storage.keys();
  }

  /**
   * Retrieves the values of the entries in the storage.
   *
   * @template T - The type of the values to retrieve.
   * @returns {Promise<T[]>} A promise that resolves with an array of values.
   */
  async values<T = unknown>(): Promise<T[]> {
    return this.storage.values() as Promise<T[]>;
  }

  /**
   * Retrieves a value for a given key from the storage.
   * If the key does not exist, returns a default value if provided.
   *
   * @template T - The type of the value to retrieve.
   * @param {NodeStorageKey} key - The key of the value to retrieve.
   * @param {T} [defaultValue] - The default value to return if the key is not found.
   * @returns {Promise<T>} A promise that resolves with the value.
   */
  async get<T = unknown>(key: NodeStorageKey, defaultValue?: T): Promise<T> {
    const datum = await this.storage.getDatum(key);

    // const value = await this.storage.getItem(key);
    if (datum?.key === key) {
      return datum.value as T;
    }
    return defaultValue as T; // Return undefined if no default value is provided
  }

  /**
   *  Performs a health check on the storage by attempting to access its data, keys, and values.
   *
   * @returns {Promise<boolean>} A promise that resolves with true if the storage is healthy, otherwise false.
   */
  async healthCheck(): Promise<boolean> {
    return performHealthCheck(this.storage);
  }

  /**
   * Logs the names of all managed storages to the console.
   *
   * @returns {Promise<number>} A promise that resolves to the number of storages managed by this NodeStorageManager.
   */
  async logStorage(): Promise<number> {
    console.log('This NodeStorageManager has these storages:');
    const storageNames = ((await this.storage.getItem('storageNames')) as NodeStorageName[] | undefined) ?? [];
    storageNames.forEach((name) => {
      console.log(`- ${name}`);
    });
    return this.storage.length();
  }
}

/**
 * Class representing a storage for nodes.
 */
export class NodeStorage {
  private readonly storage: SqliteStorage;
  private readonly initOptions: InitOptions;

  /**
   * Creates an instance of NodeStorage.
   *
   * @param {SqliteStorage} storage - The SQLite storage instance.
   * @param {InitOptions} initOptions - The initialization options.
   */
  constructor(storage: SqliteStorage, initOptions: InitOptions) {
    this.storage = storage;
    this.initOptions = initOptions;
  }

  /**
   * Closes the node storage by stopping the expired keys interval and closing the database.
   * The database is reopened if the storage is used again.
   */
  // oxlint-disable-next-line typescript/require-await
  async close(): Promise<void> {
    this.storage.close();
  }

  /**
   * Sets a value for a given key in the storage.
   *
   * @template T - The type of the value to be stored.
   * @param {NodeStorageKey} key - The key under which the value is stored.
   * @param {T} value - The value to store.
   * @returns {Promise<WriteFileResult>} A promise that resolves with the database file and the written datum.
   */
  async set<T = unknown>(key: NodeStorageKey, value: T): Promise<WriteFileResult> {
    return this.storage.setItem(key, value);
  }

  /**
   * Retrieves a value for a given key from the storage.
   * If the key does not exist, returns a default value if provided.
   *
   * @template T - The type of the value to retrieve.
   * @param {NodeStorageKey} key - The key of the value to retrieve.
   * @param {T} [defaultValue] - The default value to return if the key is not found.
   * @returns {Promise<T>} A promise that resolves with the value.
   */
  async get<T = unknown>(key: NodeStorageKey, defaultValue?: T): Promise<T> {
    const datum = await this.storage.getDatum(key);

    // const value = await this.storage.getItem(key);
    if (datum?.key === key) {
      return datum.value as T;
    }
    return defaultValue as T; // Return undefined if no default value is provided
  }

  /**
   * Checks if the storage has a given key.
   *
   * @param {NodeStorageKey} key - The key to check.
   * @returns {Promise<boolean>} A promise that resolves with true if the key exists, otherwise false.
   */
  async has(key: NodeStorageKey): Promise<boolean> {
    return this.storage.has(key);
  }

  /**
   * Checks if the storage includes a given key.
   *
   * @param {NodeStorageKey} key - The key to check.
   * @returns {Promise<boolean>} A promise that resolves with true if the key exists, otherwise false.
   */
  async includes(key: NodeStorageKey): Promise<boolean> {
    return this.has(key);
  }

  /**
   * Checks if the storage includes a given key.
   *
   * @returns {Promise<boolean>} A promise that resolves with true if the key exists, otherwise false.
   */
  async size(): Promise<number> {
    return this.storage.length();
  }

  /**
   * Removes a value for a given key from the storage.
   *
   * @param {NodeStorageKey} key - The key of the value to remove.
   * @returns {Promise<DeleteFileResult>} A promise that resolves with the database file and whether the key existed.
   */
  async remove(key: NodeStorageKey): Promise<DeleteFileResult> {
    return this.storage.removeItem(key);
  }

  /**
   * Retrieves all data from the storage as a record.
   *
   * @returns {Promise<Record<NodeStorageKey, NodeStorageValue>>} A promise that resolves with the data in the storage.
   */
  async data(): Promise<Record<NodeStorageKey, NodeStorageValue>> {
    const map = new Map<NodeStorageKey, NodeStorageValue>();
    const data = await this.storage.data();
    for (const datum of data) {
      map.set(datum.key, datum.value);
    }
    return Object.fromEntries(map);
  }

  /**
   * Retrieves the keys of the entries in the storage.
   *
   * @returns {Promise<number>} A promise that resolves with the keys of the entries in the storage.
   */
  async keys(): Promise<NodeStorageKey[]> {
    return this.storage.keys();
  }

  /**
   * Retrieves the values of the entries in the storage.
   *
   * @template T - The type of the values to retrieve.
   * @returns {Promise<T[]>} A promise that resolves with an array of values.
   */
  async values<T = unknown>(): Promise<T[]> {
    return this.storage.values() as Promise<T[]>;
  }

  /**
   *  Performs a health check on the storage by attempting to access its data, keys, and values.
   *
   * @returns {Promise<boolean>} A promise that resolves with true if the storage is healthy, otherwise false.
   */
  async healthCheck(): Promise<boolean> {
    return performHealthCheck(this.storage);
  }

  /**
   * Clears all entries from the storage.
   *
   * @returns {Promise<void>} A promise that resolves when the storage is cleared.
   */
  async clear(): Promise<void> {
    return this.storage.clear();
  }

  /**
   * Logs the current storage state to the console.
   *
   * @returns {Promise<number>} A promise that resolves with the number of keys in the storage.
   */
  async logStorage(): Promise<number> {
    console.log(`This NodeStorage has ${(await this.storage.length()).toString()} keys:`);
    const keys = await this.storage.keys();
    for (const key of keys) {
      console.log(`- ${key}: ${String(await this.storage.getItem(key))}`);
    }
    return this.storage.length();
  }
}
