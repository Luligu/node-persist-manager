/**
 * @file vitest/write_read_100_storages.test.ts
 * @description This file contains the write/read stress tests across 100 storages for the NodeStorageManager class.
 * @author Luca Liguori
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { vi } from 'vitest';

import { NodeStorage, NodeStorageManager } from '../src/nodeStorage.js';

interface DatumTest {
  key: string;
  value: any;
  ttl?: number;
}

describe('NodeStorageManager with NodeStorage', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let storageManager: NodeStorageManager;
  const dir = path.join('.cache', 'vitest', 'custom_dir_4');

  beforeAll(async () => {
    // Spy on and mock console.log
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation((...args: any[]) => {
      // Mock implementation or empty function
    });
    await fsPromises.rm(dir, { recursive: true, force: true });
  }, 30000);

  it('should create and initialize storage manager with custom directory', () => {
    storageManager = new NodeStorageManager({ dir: dir });
    expect(storageManager).toBeInstanceOf(NodeStorageManager);
    expect((storageManager as any).storage.options.dir).toContain(dir);
  });

  it('should create and initialize 100 storagee with default options', async () => {
    for (let i = 0; i < 100; i++) {
      const storageName = `testStorage_${i}`;
      const storage = await storageManager.createStorage(storageName);
      expect(storage).toBeInstanceOf(NodeStorage);
      expect((storage as any).storage.options.dir).toContain(dir);
    }
  });

  it('should write random values in each storage', async () => {
    const storages = await storageManager.getStorageNames();
    expect(storages.length).toEqual(100);
    for (const storageName of storages) {
      const storage = await storageManager.createStorage(storageName);
      expect(storage).toBeInstanceOf(NodeStorage);
      for (let i = 0; i < 100; i++) {
        const key = `key_${i}`;
        const value = { str: 'Str' + Math.random().toString(), num: Math.random() };
        await storage.set(key, value);
      }
    }
  }, 30000);

  it('storageManager should pass healthCheck', async () => {
    expect(storageManager).toBeDefined();
    if (!storageManager) return;
    expect(await storageManager.healthCheck()).toBeTruthy();
  });

  it('storages should pass healthCheck', async () => {
    expect(storageManager).toBeDefined();
    if (!storageManager) return;

    const storages = await storageManager.getStorageNames();
    expect(storages.length).toEqual(100);
    for (const storageName of storages) {
      const storage = await storageManager.createStorage(storageName);
      expect(storage).toBeInstanceOf(NodeStorage);
      expect(await storage.healthCheck()).toBeTruthy();
    }
  }, 60000);

  it('should close the storage', async () => {
    const storages = await storageManager.getStorageNames();
    expect(storages.length).toEqual(100);
    for (const storageName of storages) {
      const storage = await storageManager.createStorage(storageName);
      expect(storage).toBeInstanceOf(NodeStorage);
      await storage.close();
      expect((storage as any).storage._writeQueueInterval).toBeUndefined();
      expect((storage as any).storage._expiredKeysInterval).toBeUndefined();
    }
    await storageManager.close();
    expect((storageManager as any).storage._writeQueueInterval).toBeUndefined();
    expect((storageManager as any).storage._expiredKeysInterval).toBeUndefined();
  });
});
