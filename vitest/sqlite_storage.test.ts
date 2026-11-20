/**
 * @file vitest/sqlite_storage.test.ts
 * @description This file contains the tests for the SQLite backend: ttl, expired interval, parse options, logging and node-persist import.
 * @author Luca Liguori
 */

import { createHash } from 'node:crypto';
import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { vi } from 'vitest';

import { NodeStorageManager } from '../src/nodeStorage.js';
import { stringify } from '../src/replacer.js';
import { DATABASE_FILE_NAME, openDatabase, SqliteStorage } from '../src/sqliteStorage.js';

/**
 * Writes a file in the node-persist format.
 *
 * @param {string} dir - The storage directory.
 * @param {string} key - The key.
 * @param {string} content - The file content.
 * @returns {Promise<void>} A promise that resolves when the file is written.
 */
async function writeLegacyFile(dir: string, key: string, content: string): Promise<void> {
  await fsPromises.writeFile(path.join(dir, createHash('sha256').update(key).digest('hex')), content, 'utf8');
}

describe('SqliteStorage', () => {
  const baseDir = path.join('.cache', 'vitest', 'sqlite_storage');

  beforeAll(async () => {
    vi.spyOn(console, 'log').mockImplementation((...args: any[]) => {});
    await fsPromises.rm(baseDir, { recursive: true, force: true });
  });

  it('should expire the items with ttl = true or a number of milliseconds', async () => {
    const storage = new SqliteStorage({ dir: path.join(baseDir, 'ttl'), ttl: 1000 });
    const result = await storage.setItem('key', 'value');
    expect(result.file).toEqual(path.join(baseDir, 'ttl', 'storage.sqlite'));
    expect(result.content).toEqual({ key: 'key', value: 'value', ttl: expect.any(Number) });
    expect(await storage.getDatum('key')).toEqual({ key: 'key', value: 'value', ttl: result.content.ttl });

    const now = Date.now();
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(now + 2000);
    expect(await storage.getItem('key')).toBeUndefined();
    expect(await storage.has('key')).toBe(false);
    expect(await storage.keys()).toEqual([]);
    expect(await storage.length()).toEqual(0);
    expect(await storage.removeExpiredItems()).toEqual(1);
    dateSpy.mockRestore();

    (storage.options as any).ttl = true;
    expect((await storage.setItem('key', 'value')).content.ttl).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);
    (storage.options as any).ttl = -1;
    expect((await storage.setItem('key', 'value')).content.ttl).toBeUndefined();
    storage.close();
  });

  it('should remove the expired items with expiredInterval', async () => {
    vi.useFakeTimers();
    const storage = new SqliteStorage({ dir: path.join(baseDir, 'expired'), ttl: 1000, expiredInterval: 5000 });
    const removeSpy = vi.spyOn(storage, 'removeExpiredItems');
    await storage.setItem('key', 'value');
    vi.advanceTimersByTime(5000);
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(await storage.length()).toEqual(0);
    storage.close();
    expect((storage as any).expiredKeysInterval).toBeUndefined();
    vi.useRealTimers();

    const noIntervalStorage = new SqliteStorage({ dir: path.join(baseDir, 'expired'), expiredInterval: 0 });
    expect((noIntervalStorage as any).expiredKeysInterval).toBeUndefined();
    noIntervalStorage.close();
  });

  it('should use the stringify and parse options', async () => {
    const stringify = vi.fn((data: unknown) => JSON.stringify({ wrapped: data }));
    const parse = vi.fn((text: string) => (JSON.parse(text) as { wrapped: unknown }).wrapped);
    const storage = new SqliteStorage({ dir: path.join(baseDir, 'parse'), stringify, parse });
    await storage.setItem('key', { a: 1 });
    expect(await storage.getItem('key')).toEqual({ a: 1 });
    expect(stringify).toHaveBeenCalled();
    expect(parse).toHaveBeenCalled();
    storage.close();
  });

  it('should return a detached copy of the serialized value', async () => {
    const storage = new SqliteStorage({ dir: path.join(baseDir, 'write-result') });
    const value = { nested: { count: 1 }, createdAt: new Date('2026-01-02T03:04:05.000Z') };
    const result = await storage.setItem('key', value);

    value.nested.count = 2;
    expect(result.content).toEqual({
      key: 'key',
      value: { nested: { count: 1 }, createdAt: '2026-01-02T03:04:05.000Z' },
    });
    expect(await storage.getItem('key')).toEqual(result.content.value);
    storage.close();
  });

  it('should throw or skip the values that cannot be parsed', async () => {
    const storage = new SqliteStorage({ dir: path.join(baseDir, 'invalid') });
    await storage.setItem('key', 'value');
    (storage as any).open().set.run('invalid', '{not json', null);
    await expect(storage.getItem('invalid')).rejects.toThrow('the value of invalid');
    await expect(storage.data()).rejects.toThrow('is not valid');

    (storage.options as any).parse = (): never => {
      // oxlint-disable-next-line typescript/only-throw-error -- test a parser that throws a non Error value
      throw 'not an error';
    };
    await expect(storage.getItem('invalid')).rejects.toThrow('not an error');

    (storage.options as any).forgiveParseErrors = true;
    expect(await storage.getDatum('invalid')).toBeUndefined();
    expect(await storage.data()).toEqual([]);
    expect(await storage.keys()).toEqual(['key', 'invalid']);
    storage.close();
    storage.close(); // Close twice is safe
  });

  it('should fail the health check when a value cannot be parsed and forgiveParseErrors is set', async () => {
    const manager = new NodeStorageManager({ dir: path.join(baseDir, 'health'), forgiveParseErrors: true });
    const nodeStorage = await manager.createStorage('health');
    await nodeStorage.set('key', 'value');
    expect(await nodeStorage.healthCheck()).toBe(true);
    (nodeStorage as any).storage.open().set.run('invalid', '{not json', null);
    expect(await nodeStorage.get('invalid', 'default')).toEqual('default');
    expect(await nodeStorage.keys()).toEqual(['key', 'invalid']);
    expect(await nodeStorage.data()).toEqual({ key: 'value' });
    expect(await nodeStorage.healthCheck()).toBe(false);
    await manager.close();
  });

  it('should store undefined as a key without value', async () => {
    const storage = new SqliteStorage({ dir: path.join(baseDir, 'undefined') });
    const result = await storage.setItem('key', undefined);
    expect(result.content).toEqual({ key: 'key', value: undefined });
    expect(await storage.has('key')).toBe(true);
    expect(await storage.getItem('key')).toBeUndefined();
    expect(await storage.keys()).toEqual(['key']);
    storage.close();
    storage.close(); // Close twice is safe
  });

  it('should log with console.log or with a custom logging function', async () => {
    const dir = path.join(baseDir, 'logging');
    await fsPromises.mkdir(dir, { recursive: true });
    await writeLegacyFile(dir, 'key', '{not json');
    const logging = vi.fn();
    new SqliteStorage({ dir, logging }).close();
    expect(logging).toHaveBeenCalledWith(expect.stringContaining('Skipped node-persist file'), expect.any(SyntaxError));

    const consoleLogSpy = vi.spyOn(console, 'log');
    await fsPromises.rm(path.join(dir, 'storage.sqlite'));
    new SqliteStorage({ dir, logging: true }).close();
    expect(consoleLogSpy).toHaveBeenCalledWith('[node-persist-manager]', expect.stringContaining('Skipped node-persist file'), expect.any(SyntaxError));

    consoleLogSpy.mockClear();
    await fsPromises.rm(path.join(dir, 'storage.sqlite'));
    new SqliteStorage({ dir, logging: false }).close();
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should import the node-persist files when the database is created', async () => {
    const dir = path.join(baseDir, 'legacy');
    await fsPromises.mkdir(path.join(dir, '.subStorage'), { recursive: true });
    await fsPromises.mkdir(path.join(dir, createHash('sha256').update('directory').digest('hex')), { recursive: true });
    await writeLegacyFile(dir, 'storageNames', JSON.stringify({ key: 'storageNames', value: ['subStorage'] }));
    await writeLegacyFile(dir, 'ttl', JSON.stringify({ key: 'ttl', value: 1, ttl: Date.now() + 60000 }));
    await writeLegacyFile(dir, 'expired', JSON.stringify({ key: 'expired', value: 2, ttl: Date.now() - 1000 }));
    await writeLegacyFile(dir, 'undefined', JSON.stringify({ key: 'undefined' }));
    await writeLegacyFile(dir, 'bigint', stringify({ key: 'bigint', value: { count: 9007199254740993n, prefix: '__node_persist__:raw' } }) ?? '');
    await writeLegacyFile(dir, 'null', 'null');
    await writeLegacyFile(dir, 'noKey', JSON.stringify({ value: 3 }));
    await fsPromises.writeFile(path.join(dir, 'other.txt'), JSON.stringify({ key: 'other', value: 4 }), 'utf8');
    await writeLegacyFile(path.join(dir, '.subStorage'), 'subKey', JSON.stringify({ key: 'subKey', value: { a: 1 } }));

    const storageManager = new NodeStorageManager({ dir, logging: true });
    expect(await storageManager.getStorageNames()).toEqual(['subStorage']);
    expect((await storageManager.keys()).toSorted()).toEqual(['bigint', 'storageNames', 'ttl', 'undefined']);
    expect(await storageManager.get('undefined', 'default')).toBeUndefined();
    expect(await storageManager.get('bigint')).toEqual({ count: 9007199254740993n, prefix: '__node_persist__:raw' });
    const storage = await storageManager.createStorage('subStorage');
    expect(await storage.data()).toEqual({ subKey: { a: 1 } });

    // The import runs only when the database is created
    await storage.close();
    await writeLegacyFile(path.join(dir, '.subStorage'), 'newKey', JSON.stringify({ key: 'newKey', value: 5 }));
    expect(await storage.keys()).toEqual(['subKey']);
    await storage.close();
    await storageManager.close();
  });

  it('should retry the legacy import when database initialization fails', async () => {
    const dir = path.join(baseDir, 'interrupted_import');
    await fsPromises.mkdir(dir, { recursive: true });
    await writeLegacyFile(dir, 'invalid', '{not json');

    const loggingError = new Error('logging failed');
    expect(
      () =>
        new SqliteStorage({
          dir,
          logging: (): never => {
            throw loggingError;
          },
        }),
    ).toThrow(loggingError);

    await writeLegacyFile(dir, 'valid', JSON.stringify({ key: 'valid', value: 42 }));
    const storage = new SqliteStorage({ dir });
    expect(await storage.getItem('valid')).toEqual(42);
    storage.close();
  });

  it('should not overwrite newer SQLite values when retrying the legacy import', async () => {
    const dir = path.join(baseDir, 'legacy_recovery');
    const storage = new SqliteStorage({ dir });
    await storage.setItem('existing', 'sqlite');
    storage.close();

    const database = openDatabase(path.join(dir, DATABASE_FILE_NAME));
    database.exec("DELETE FROM metadata WHERE key = 'legacy-import-complete'");
    database.close();
    await writeLegacyFile(dir, 'existing', JSON.stringify({ key: 'existing', value: 'legacy' }));
    await writeLegacyFile(dir, 'missing', JSON.stringify({ key: 'missing', value: 'legacy' }));

    const recoveredStorage = new SqliteStorage({ dir });
    expect(await recoveredStorage.getItem('existing')).toEqual('sqlite');
    expect(await recoveredStorage.getItem('missing')).toEqual('legacy');
    recoveredStorage.close();
  });

  it('should convert the full Matterbridge node-persist fixture in vitest/storage to SQLite', async () => {
    const fixtureDir = path.join(baseDir, 'matterbridge_fixture');
    await fsPromises.cp(path.join('vitest', 'storage'), fixtureDir, { recursive: true });

    const expectedStorages = [
      'matterbridge',
      'matterbridge-zigbee2mqtt',
      'matterbridge-shelly',
      'matterbridge-somfy-tahoma',
      'matterbridge-test',
      'matterbridge-example-accessory-platform',
      'matterbridge-example-dynamic-platform',
      'matterbridge-hass',
      'matterbridge-irobot',
      'matterbridge-security',
      'matterbridge-host-health',
    ];

    const storageManager = new NodeStorageManager({ dir: fixtureDir });
    expect(await storageManager.healthCheck()).toBe(true);
    expect(await storageManager.keys()).toEqual(['storageNames']);
    expect(await storageManager.getStorageNames()).toEqual(expectedStorages);

    const mbStorage = await storageManager.createStorage('matterbridge');
    expect(await mbStorage.healthCheck()).toBe(true);
    expect(await mbStorage.size()).toBe(20);
    expect(await mbStorage.get('bridgeMode')).toBe('childbridge');
    expect(await mbStorage.get('matterport')).toBe(5540);
    expect(await mbStorage.get('matterpasscode')).toBe(66782997);
    expect(await mbStorage.get('matterdiscriminator')).toBe(2846);
    expect(await mbStorage.get('mattermdnsinterface')).toBe('eth0');
    expect(await mbStorage.get('matterbridgeUuid')).toBe('b16b8a18-44f2-46f4-aa66-c0538a70f730');
    expect(await mbStorage.get('devices')).toEqual([]);
    const plugins = await mbStorage.get<Array<{ name: string }>>('plugins');
    expect(plugins).toHaveLength(7);
    await mbStorage.close();

    for (const pluginName of expectedStorages.slice(1)) {
      const pluginStorage = await storageManager.createStorage(pluginName);
      expect(await pluginStorage.healthCheck()).toBe(true);
      expect(await pluginStorage.size()).toBe(6);
      const data = await pluginStorage.data();
      expect(data).toEqual({
        name: pluginName,
        type: pluginName === 'matterbridge-example-accessory-platform' ? 'AccessoryPlatform' : 'DynamicPlatform',
        version: expect.any(String),
        description: expect.any(String),
        author: 'https://github.com/Luligu',
        path: `/usr/local/lib/node_modules/${pluginName}/package.json`,
      });
      await pluginStorage.close();
    }

    await storageManager.close();
  });
});
