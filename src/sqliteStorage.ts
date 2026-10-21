/**
 * @file src/sqliteStorage.ts
 * @description This file contains the internal SQLite key/value store used by NodeStorageManager and NodeStorage
 * @author Luca Liguori
 * @created 2026-10-21
 * @version 1.0.0
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
// The SQLite drivers are synchronous: the methods stay async to keep the Promise-based API of node-persist.
/* oxlint-disable typescript/require-await */

import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

/**
 * Initialization options. They are compatible with the node-persist InitOptions.
 */
export interface InitOptions {
  /** Directory of the storage. The SQLite database is created inside it. */
  dir?: string | undefined;
  /** Serializer of the values. Default JSON.stringify. */
  stringify?: (data: any) => string | undefined; // oxlint-disable-line typescript/no-explicit-any -- same signature as node-persist
  /** Parser of the values. Default JSON.parse. */
  parse?: (str: string) => any; // oxlint-disable-line typescript/no-explicit-any -- same signature as node-persist
  /** Kept for compatibility with node-persist. Ignored: SQLite always uses utf8. */
  encoding?: BufferEncoding | undefined;
  /** Enable logging with console.log or with a custom logging function. Default false. */
  logging?: boolean | ((...args: any[]) => void) | undefined; // oxlint-disable-line typescript/no-explicit-any -- same signature as node-persist
  /** Interval in milliseconds to remove the expired items. Default undefined (no interval). */
  expiredInterval?: number | undefined;
  /** Skip the values that cannot be parsed instead of throwing. Default false. */
  forgiveParseErrors?: boolean | undefined;
  /** Time to live of the items: true for 24 hours or a number of milliseconds. Default false. */
  ttl?: number | boolean | undefined;
  /** Kept for compatibility with node-persist. Ignored: SQLite writes are immediate. */
  writeQueue?: boolean | undefined;
  /** Kept for compatibility with node-persist. Ignored: SQLite writes are immediate. */
  writeQueueIntervalMs?: number | undefined;
  /** Kept for compatibility with node-persist. Ignored: SQLite writes are immediate. */
  writeQueueWriteOnlyLast?: boolean | undefined;
}

/**
 * A stored item.
 */
export interface Datum {
  key: string;
  value: unknown;
  ttl?: number;
}

/**
 * Result of a write. It is compatible with the node-persist WriteFileResult.
 */
export interface WriteFileResult {
  /** The SQLite database file. */
  file: string;
  /** The written datum. */
  content: Datum;
}

/**
 * Result of a delete. It is compatible with the node-persist DeleteFileResult.
 */
export interface DeleteFileResult {
  /** The SQLite database file. */
  file: string;
  /** True when the key has been removed. */
  removed: boolean;
  /** True when the key existed. */
  existed: boolean;
}

type SqliteValue = string | number | null;
type SqliteRow = Record<string, SqliteValue>;

/** The subset of the node:sqlite StatementSync and bun:sqlite Statement APIs used by this store. */
interface SqliteStatement {
  run(...params: SqliteValue[]): { changes: number | bigint };
  get(...params: SqliteValue[]): SqliteRow | null | undefined;
  all(...params: SqliteValue[]): SqliteRow[];
}

/** The subset of the node:sqlite DatabaseSync and bun:sqlite Database APIs used by this store. */
interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  close(): void;
}

interface SqliteStatements {
  get: SqliteStatement;
  has: SqliteStatement;
  set: SqliteStatement;
  remove: SqliteStatement;
  all: SqliteStatement;
  keys: SqliteStatement;
  count: SqliteStatement;
  clear: SqliteStatement;
  removeExpired: SqliteStatement;
}

/** The name of the SQLite database file created in the storage directory. */
export const DATABASE_FILE_NAME = 'storage.sqlite';

const DEFAULT_TTL = 24 * 60 * 60 * 1000; // If ttl is true, use 24 hours like node-persist
const LEGACY_FILE_REGEX = /^[0-9a-f]{64}$/; // node-persist stores each key in a file named with the sha256 of the key
const NOT_EXPIRED = '(ttl IS NULL OR ttl > ?)';

const require = createRequire(import.meta.url);

/**
 * Opens a SQLite database with the driver of the running runtime: bun:sqlite on Bun, node:sqlite on Node.js.
 *
 * @param {string} file - The database file.
 * @returns {SqliteDatabase} The opened database.
 */
export function openDatabase(file: string): SqliteDatabase {
  if (process.versions.bun !== undefined) {
    const { Database } = require('bun:sqlite') as { Database: new (file: string, options: { create: boolean }) => SqliteDatabase };
    return new Database(file, { create: true });
  }
  const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (file: string) => SqliteDatabase };
  return new DatabaseSync(file);
}

/**
 * Key/value store backed by a SQLite database, with the subset of the node-persist LocalStorage API used by this package.
 *
 * The database is opened lazily and reopened on demand after close().
 */
export class SqliteStorage {
  readonly options: InitOptions;
  readonly dir: string;
  readonly file: string;
  private database: SqliteDatabase | undefined;
  private statements: SqliteStatements | undefined;
  private expiredKeysInterval: NodeJS.Timeout | undefined;

  /**
   * Creates the store and opens its database.
   *
   * @param {InitOptions} options - The initialization options. The dir option is required.
   */
  constructor(options: InitOptions & { dir: string }) {
    this.options = options;
    this.dir = options.dir;
    this.file = path.join(options.dir, DATABASE_FILE_NAME);
    this.open();
  }

  /**
   * Opens the database if not already open: creates the directory and the table, imports the node-persist files on creation and starts the expired keys interval.
   *
   * Uses the WAL journal with synchronous NORMAL: the recommended settings for performance that never corrupt the database.
   *
   * @returns {SqliteStatements} The prepared statements of the opened database.
   */
  private open(): SqliteStatements {
    if (this.statements) return this.statements;
    mkdirSync(this.dir, { recursive: true });
    const isNew = !existsSync(this.file);
    const database = openDatabase(this.file);
    database.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;');
    database.exec('CREATE TABLE IF NOT EXISTS storage (key TEXT PRIMARY KEY NOT NULL, value TEXT, ttl INTEGER)');
    this.database = database;
    this.statements = {
      get: database.prepare(`SELECT value, ttl FROM storage WHERE key = ? AND ${NOT_EXPIRED}`),
      has: database.prepare(`SELECT 1 AS found FROM storage WHERE key = ? AND ${NOT_EXPIRED}`),
      set: database.prepare('INSERT INTO storage (key, value, ttl) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, ttl = excluded.ttl'),
      remove: database.prepare('DELETE FROM storage WHERE key = ?'),
      all: database.prepare(`SELECT key, value, ttl FROM storage WHERE ${NOT_EXPIRED} ORDER BY rowid`),
      keys: database.prepare(`SELECT key FROM storage WHERE ${NOT_EXPIRED} ORDER BY rowid`),
      count: database.prepare(`SELECT COUNT(*) AS count FROM storage WHERE ${NOT_EXPIRED}`),
      clear: database.prepare('DELETE FROM storage'),
      removeExpired: database.prepare('DELETE FROM storage WHERE ttl IS NOT NULL AND ttl <= ?'),
    };
    if (isNew) this.importLegacyFiles(this.statements);
    if (typeof this.options.expiredInterval === 'number' && this.options.expiredInterval > 0) {
      this.expiredKeysInterval = setInterval(() => {
        void this.removeExpiredItems();
      }, this.options.expiredInterval).unref();
    }
    return this.statements;
  }

  /**
   * Imports the items stored by node-persist in the storage directory into the new database. The node-persist files are left in place.
   *
   * Edge cases:
   *  - files that cannot be read or parsed, or that are not valid node-persist items, are skipped;
   *  - expired items are skipped.
   *
   * @param {SqliteStatements} statements - The prepared statements of the new database.
   * @returns {number} The number of imported items.
   */
  private importLegacyFiles(statements: SqliteStatements): number {
    const now = Date.now();
    let imported = 0;
    for (const entry of readdirSync(this.dir, { withFileTypes: true })) {
      if (!entry.isFile() || !LEGACY_FILE_REGEX.test(entry.name)) continue;
      try {
        const datum = JSON.parse(readFileSync(path.join(this.dir, entry.name), 'utf8')) as Partial<Datum> | null;
        if (!datum || typeof datum.key !== 'string') continue;
        const ttl = typeof datum.ttl === 'number' ? datum.ttl : null;
        if (ttl !== null && ttl <= now) continue;
        statements.set.run(datum.key, this.serialize(datum.value), ttl);
        imported++;
      } catch (error) {
        this.log(`Skipped node-persist file ${entry.name}:`, error);
      }
    }
    if (imported > 0) this.log(`Imported ${imported} node-persist items into ${this.file}`);
    return imported;
  }

  /**
   * Logs a message when logging is enabled.
   *
   * @param {...unknown} args - The message and its arguments.
   */
  private log(...args: unknown[]): void {
    if (typeof this.options.logging === 'function') this.options.logging(...args);
    else if (this.options.logging === true) console.log('[node-persist-manager]', ...args);
  }

  /**
   * Serializes a value with the stringify option.
   *
   * @param {unknown} value - The value to serialize.
   * @returns {string | null} The serialized value or null for undefined.
   */
  private serialize(value: unknown): string | null {
    return (this.options.stringify ?? JSON.stringify)(value) ?? null;
  }

  /**
   * Parses a stored value with the parse option.
   *
   * @param {string} key - The key of the value (for the error message).
   * @param {SqliteValue} text - The stored value.
   * @returns {{ isValid: boolean; value: unknown }} The parsed value; isValid is false when the value cannot be parsed and forgiveParseErrors is set.
   * @throws {Error} When the value cannot be parsed and forgiveParseErrors is not set.
   */
  private deserialize(key: string, text: SqliteValue): { isValid: boolean; value: unknown } {
    if (text === null) return { isValid: true, value: undefined };
    try {
      return { isValid: true, value: (this.options.parse ?? JSON.parse)(String(text)) };
    } catch (error) {
      if (this.options.forgiveParseErrors === true) return { isValid: false, value: undefined };
      throw new Error(`[node-persist-manager] the value of ${key} in ${this.file} is not valid: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
  }

  /**
   * Converts a row to a datum.
   *
   * @param {string} key - The key of the row.
   * @param {SqliteRow} row - The row with the value and ttl columns.
   * @returns {Datum | undefined} The datum or undefined when the value cannot be parsed and forgiveParseErrors is set.
   */
  private toDatum(key: string, row: SqliteRow): Datum | undefined {
    const { isValid, value } = this.deserialize(key, row.value);
    if (!isValid) return undefined;
    return row.ttl === null ? { key, value } : { key, value, ttl: Number(row.ttl) };
  }

  /**
   * Computes the expiration timestamp from the ttl option.
   *
   * @returns {number | null} The expiration timestamp in milliseconds or null when the item does not expire.
   */
  private expiration(): number | null {
    const ttl = this.options.ttl;
    if (typeof ttl === 'number' && ttl > 0) return Date.now() + ttl;
    if (ttl === true) return Date.now() + DEFAULT_TTL;
    return null;
  }

  /**
   * Retrieves all the not expired items in insertion order.
   *
   * @returns {Promise<Datum[]>} A promise that resolves with the items.
   */
  async data(): Promise<Datum[]> {
    const data: Datum[] = [];
    for (const row of this.open().all.all(Date.now())) {
      const datum = this.toDatum(String(row.key), row);
      if (datum) data.push(datum);
    }
    return data;
  }

  /**
   * Retrieves the keys of all the not expired items in insertion order.
   *
   * @returns {Promise<string[]>} A promise that resolves with the keys.
   */
  async keys(): Promise<string[]> {
    return this.open()
      .keys.all(Date.now())
      .map((row) => String(row.key));
  }

  /**
   * Retrieves the values of all the not expired items in insertion order.
   *
   * @returns {Promise<unknown[]>} A promise that resolves with the values.
   */
  async values(): Promise<unknown[]> {
    return (await this.data()).map((datum) => datum.value);
  }

  /**
   * Retrieves the number of the not expired items.
   *
   * @returns {Promise<number>} A promise that resolves with the number of items.
   */
  async length(): Promise<number> {
    const [row] = this.open().count.all(Date.now());
    return Number(row.count);
  }

  /**
   * Retrieves the item of a key.
   *
   * @param {string} key - The key.
   * @returns {Promise<Datum | undefined>} A promise that resolves with the item or undefined when the key does not exist or is expired.
   */
  async getDatum(key: string): Promise<Datum | undefined> {
    const row = this.open().get.get(key, Date.now());
    return row ? this.toDatum(key, row) : undefined;
  }

  /**
   * Retrieves the value of a key.
   *
   * @param {string} key - The key.
   * @returns {Promise<unknown>} A promise that resolves with the value or undefined when the key does not exist or is expired.
   */
  async getItem(key: string): Promise<unknown> {
    return (await this.getDatum(key))?.value;
  }

  /**
   * Checks if a not expired key exists.
   *
   * @param {string} key - The key.
   * @returns {Promise<boolean>} A promise that resolves with true when the key exists.
   */
  async has(key: string): Promise<boolean> {
    return Boolean(this.open().has.get(key, Date.now()));
  }

  /**
   * Stores the value of a key.
   *
   * @param {string} key - The key.
   * @param {unknown} value - The value. It must be serializable with the stringify option.
   * @returns {Promise<WriteFileResult>} A promise that resolves with the database file and the written datum.
   */
  async setItem(key: string, value: unknown): Promise<WriteFileResult> {
    const text = this.serialize(value);
    const ttl = this.expiration();
    this.open().set.run(key, text, ttl);
    const content: Datum = { key, value: this.deserialize(key, text).value };
    if (ttl !== null) content.ttl = ttl;
    return { file: this.file, content };
  }

  /**
   * Removes a key.
   *
   * @param {string} key - The key.
   * @returns {Promise<DeleteFileResult>} A promise that resolves with the database file and whether the key existed.
   */
  async removeItem(key: string): Promise<DeleteFileResult> {
    const existed = Number(this.open().remove.run(key).changes) > 0;
    return { file: this.file, removed: existed, existed };
  }

  /**
   * Removes the expired items.
   *
   * @returns {Promise<number>} A promise that resolves with the number of removed items.
   */
  async removeExpiredItems(): Promise<number> {
    return Number(this.open().removeExpired.run(Date.now()).changes);
  }

  /**
   * Removes all the items.
   *
   * @returns {Promise<void>} A promise that resolves when the items are removed.
   */
  async clear(): Promise<void> {
    this.open().clear.run();
  }

  /**
   * Stops the expired keys interval and closes the database. The database is reopened on the next operation.
   */
  close(): void {
    clearInterval(this.expiredKeysInterval);
    this.expiredKeysInterval = undefined;
    this.statements = undefined;
    this.database?.close();
    this.database = undefined;
  }
}
