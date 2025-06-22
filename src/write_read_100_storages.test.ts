import fsPromises from 'node:fs/promises';

import NodePersist from 'node-persist';
import { jest } from '@jest/globals';

import { NodeStorageManager, NodeStorage } from './nodeStorage.ts';

interface DatumTest {
  key: string;
  value: any;
  ttl?: number;
}

describe('NodeStorageManager with NodeStorage', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let storageManager: NodeStorageManager;
  const isDevContainer = process.env.REMOTE_CONTAINERS === 'true';
  const dir = isDevContainer ? 'node_modules/custom_dir_4' : 'custom_dir_4';

  beforeAll(async () => {
    // Spy on and mock console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((...args: any[]) => {
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
    expect(await NodeStorage.healthCheck((storageManager as any).storage)).toBeTruthy();
  });

  it('storages should pass healthCheck', async () => {
    expect(storageManager).toBeDefined();
    if (!storageManager) return;

    const storages = await storageManager.getStorageNames();
    expect(storages.length).toEqual(100);
    for (const storageName of storages) {
      const storage = await storageManager.createStorage(storageName);
      expect(storage).toBeInstanceOf(NodeStorage);
      expect(await NodeStorage.healthCheck((storage as any).storage)).toBeTruthy();
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
