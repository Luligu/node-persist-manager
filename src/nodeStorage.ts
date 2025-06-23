/* eslint-disable no-console */
/**
 * This file contains the classes NodeStorageManager and NodeStorage
 *
 * @file nodeStorage.ts
 * @author Luca Liguori
 * @created 2024-02-02
 * @version 1.0.1
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

import { rm } from 'node:fs/promises';
import path from 'node:path';

import NodePersist, { LocalStorage } from 'node-persist';
import type { InitOptions } from 'node-persist';

export type NodeStorageKey = string;
export type NodeStorageValue = unknown;
export type NodeStorageName = string;

/**
 * Class responsible for managing multiple node storages.
 */
export class NodeStorageManager {
  private readonly storage: LocalStorage;
  private readonly initOptions: InitOptions;
  private storageNames: NodeStorageName[] = [];

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
      } as InitOptions,
      initOptions,
    );

    // Create and initialize a new instace of LocalStorage
    this.storage = NodePersist.create(this.initOptions);
    this.storage.initSync(this.initOptions);
    if (this.storage.options.writeQueue === false) {
      clearInterval(this.storage._writeQueueInterval);
      this.storage._writeQueueInterval = undefined;
    }
    if (this.initOptions.logging === true) {
      console.log(`Storage manager initialized with options ${JSON.stringify(this.initOptions)}`);
    }
  }

  /**
   * Closes the node storage manager by stopping the expired keys interval and the write queue interval.
   */
  async close() {
    this.storage.stopExpiredKeysInterval();
    this.storage._expiredKeysInterval = undefined;
    this.storage.stopWriteQueueInterval();
    this.storage._writeQueueInterval = undefined;
  }

  /**
   * Creates and initializes a new storage with a given name.
   *
   * @param {string} storageName - The name of the new storage to create.
   * @returns {Promise<NodeStorage>} A promise that resolves to the newly created NodeStorage instance.
   */
  async createStorage(storageName: string): Promise<NodeStorage> {
    const initOptions: InitOptions = {};
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    Object.assign(initOptions, this.initOptions, { dir: path.join(this.initOptions.dir!, '.' + storageName) } as InitOptions);
    const storage = NodePersist.create(initOptions);
    await storage.init(initOptions);
    if (storage.options.writeQueue === false) {
      clearInterval(storage._writeQueueInterval);
      storage._writeQueueInterval = undefined;
    }

    // Update storageNames
    this.storageNames = (await this.storage.get('storageNames')) ?? [];
    if (!this.storageNames.includes(storageName)) {
      this.storageNames.push(storageName);
    }
    await this.storage.set('storageNames', this.storageNames);

    return new NodeStorage(storage, initOptions);
  }

  /**
   * Removes a storage by its name.
   *
   * @param {string} storageName - The name of the storage to remove.
   * @returns {Promise<boolean>} A promise that resolves to true if the storage was successfully removed, otherwise false.
   */
  async removeStorage(storageName: string): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const dir = path.join(this.initOptions.dir!, '.' + storageName);
    try {
      await rm(dir, { recursive: true });
      // console.log('Storage removed');

      // Update storageNames
      this.storageNames = (await this.storage.get('storageNames')) ?? [];
      const index = this.storageNames.indexOf(storageName);
      if (index > -1) {
        this.storageNames.splice(index, 1);
      }
      await this.storage.set('storageNames', this.storageNames);
      // console.log('Storage list:', await this.storage.get('storageNames') );

      return true;
    } catch (_err) {
      // console.error('Error removing storage:', _err);
      return false;
    }
  }

  /**
   * Retrieves the names of all available storages.
   *
   * @returns {Promise<NodeStorageName[]>} A promise that resolves to an array of storage names.
   */
  async getStorageNames(): Promise<NodeStorageName[]> {
    this.storageNames = (await this.storage.get('storageNames')) ?? [];
    return this.storageNames;
  }

  /**
   * Logs the names of all managed storages to the console.
   *
   * @returns {Promise<number>} A promise that resolves to the number of storages managed by this NodeStorageManager.
   */
  async logStorage(): Promise<number> {
    console.log('This NodeStorageManager has these storages:');
    const storageNames: NodeStorageName[] = (await this.storage.get('storageNames')) ?? [];
    storageNames.forEach((name) => {
      console.log(`- ${name}`);
    });
    return await this.storage.length();
  }
}

/**
 * Class representing a storage for nodes.
 */
export class NodeStorage {
  private readonly storage: LocalStorage;
  private readonly initOptions: InitOptions;

  /**
   * Creates an instance of NodeStorage.
   *
   * @param {LocalStorage} storage - The local storage instance.
   * @param {InitOptions} initOptions - The initialization options.
   */
  constructor(storage: LocalStorage, initOptions: InitOptions) {
    this.storage = storage;
    this.initOptions = initOptions;
  }

  /**
   * Closes the node storage by stopping the expired keys interval and the write queue interval.
   */
  async close() {
    this.storage.stopExpiredKeysInterval();
    this.storage._expiredKeysInterval = undefined;
    this.storage.stopWriteQueueInterval();
    this.storage._writeQueueInterval = undefined;
  }

  /**
   * Sets a value for a given key in the storage.
   *
   * @template T - The type of the value to be stored.
   * @param {NodeStorageKey} key - The key under which the value is stored.
   * @param {T} value - The value to store.
   * @returns {Promise<NodePersist.WriteFileResult>} A promise that resolves with the result of writing the file.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async set<T = any>(key: NodeStorageKey, value: T): Promise<NodePersist.WriteFileResult> {
    return await this.storage.setItem(key, value);
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get<T = any>(key: NodeStorageKey, defaultValue?: T): Promise<T> {
    const datum = await this.storage.getDatum(key);

    // const value = await this.storage.getItem(key);
    if (datum && datum.key === key) {
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
    const keys = await this.storage.keys();
    return keys.includes(key);
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
   * @returns {Promise<NodePersist.DeleteFileResult>} A promise that resolves with the result of deleting the file.
   */
  async remove(key: NodeStorageKey): Promise<NodePersist.DeleteFileResult> {
    return await this.storage.removeItem(key);
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
      map.set(datum.key, datum.value as NodeStorageValue);
    }
    return Object.fromEntries(map);
  }

  /**
   * Retrieves the keys of the entries in the storage.
   *
   * @returns {Promise<number>} A promise that resolves with the keys of the entries in the storage.
   */
  async keys(): Promise<NodeStorageKey[]> {
    return await this.storage.keys();
  }

  /**
   * Retrieves the values of the entries in the storage.
   *
   * @template T - The type of the values to retrieve.
   * @returns {Promise<T[]>} A promise that resolves with an array of values.
   */
  async values<T = unknown>(): Promise<T[]> {
    return (await this.storage.values()) as unknown as Promise<T[]>;
  }

  static async healthCheck(storage: NodePersist.LocalStorage): Promise<boolean> {
    try {
      // Attempt to get data and keys, and access the first key
      const data = await storage.data();
      for (const datum of data) {
        if (!datum || !datum.key) {
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

  /**
   * Clears all entries from the storage.
   *
   * @returns {Promise<void>} A promise that resolves when the storage is cleared.
   */
  async clear(): Promise<void> {
    return await this.storage.clear();
  }

  /**
   * Logs the current storage state to the console.
   *
   * @returns {Promise<number>} A promise that resolves with the number of keys in the storage.
   */
  async logStorage(): Promise<number> {
    console.log(`This NodeStorage has ${await this.storage.length()} keys:`);
    const keys = await this.storage.keys();
    for (const key of keys) {
      console.log(`- ${key}: ${await this.storage.get(key)}`);
    }
    return await this.storage.length();
  }
}
