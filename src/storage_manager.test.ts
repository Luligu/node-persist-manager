import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { jest } from '@jest/globals';

import { NodeStorage, NodeStorageManager } from './nodeStorage.js';

// Mock fs/promises module
const rmSpy = jest.spyOn(fsPromises, 'rm');

describe('NodeStorageManager with NodeStorage', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  let storageManager: NodeStorageManager;
  let storage: NodeStorage;
  const storageDir = path.join('.cache', 'jest', 'node_storage');
  const customDir1 = path.join('.cache', 'jest', 'custom_dir_1');
  const customDir2 = path.join('.cache', 'jest', 'custom_dir_2');

  beforeAll(async () => {
    // Spy on and mock console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((...args: any[]) => {
      // Mock implementation or empty function
    });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
      // Mock implementation or empty function
    });
    await fsPromises.rm(storageDir, { recursive: true, force: true });
    storageManager = new NodeStorageManager({ dir: storageDir });
  });

  it('should create and initialize storage with default options', async () => {
    expect(storageManager).toBeInstanceOf(NodeStorageManager);
  });

  it('should not fail with a not existing storages', async () => {
    expect(await storageManager.getStorageNames()).toEqual([]);
    expect(await storageManager.logStorage()).toBe(0);
    await fsPromises.mkdir(path.join(storageDir, '.testStorage X'), { recursive: true });
    expect(await storageManager.removeStorage('testStorage X')).toBe(true);
  });

  it('should create the storages', async () => {
    storage = await storageManager.createStorage('testStorage');
    expect(storage).toBeInstanceOf(NodeStorage);
  });

  it('should return the number of the storages created', async () => {
    const keys = await storageManager.getStorageNames();
    expect(keys?.length).toEqual(1);
  });

  it('should not create twice the same storage', async () => {
    storage = await storageManager.createStorage('testStorage');
    const keys = await storageManager.getStorageNames();
    expect(keys?.length).toEqual(1);
  });

  it('should return the name of the storage created', async () => {
    const keys = await storageManager.getStorageNames();
    expect(keys).toEqual(['testStorage']);
  });

  it('should return the number of storages created', async () => {
    await storageManager.createStorage('testStorage 2');
    await storageManager.createStorage('testStorage 3');
    const keys = await storageManager.getStorageNames();
    expect(keys).toEqual(['testStorage', 'testStorage 2', 'testStorage 3']);
    expect(keys?.length).toEqual(3);
  });

  it('removeStorage should return false', async () => {
    expect(await storageManager.removeStorage('testStorage X')).toEqual(false);
  });

  it('should log the storageManager names', async () => {
    const size = await storageManager.logStorage();
    expect(size).toEqual(1);
  });

  it('should log the storage keys', async () => {
    const size = await storage.logStorage();
    expect(size).toEqual(0);
  });

  it('should return the names of storages created', async () => {
    let keys = await storageManager.getStorageNames();
    const expectedNames = ['testStorage', 'testStorage 2', 'testStorage 3'];
    expect(keys).toEqual(expectedNames);

    await storageManager.removeStorage('testStorage 2');
    keys = await storageManager.getStorageNames();
    expect(keys).toEqual(['testStorage', 'testStorage 3']);

    await storageManager.removeStorage('testStorage 3');
    keys = await storageManager.getStorageNames();
    expect(keys).toEqual(['testStorage']);
  });

  it('should return the storageManager keys', async () => {
    const keys = await storageManager.keys();
    expect(keys).toEqual(['storageNames']);
  });

  it('should return the storageManager values', async () => {
    const values = await storageManager.values<string[]>();
    expect(values).toEqual([['testStorage']]);
  });

  it('storageManager should pass healthCheck', async () => {
    expect(storageManager).toBeDefined();
    if (!storageManager) return;
    expect(await storageManager.healthCheck()).toBeTruthy();
  });

  it('storageManager should fail healthCheck', async () => {
    expect(storageManager).toBeDefined();
    if (!storageManager) return;
    (storageManager as any).storage.options.logging = true;
    jest.spyOn((storageManager as any).storage, 'data').mockImplementationOnce(() => {
      return Promise.resolve(null);
    });
    expect(await storageManager.healthCheck()).toBeFalsy();

    jest.spyOn((storageManager as any).storage, 'data').mockImplementationOnce(() => {
      return Promise.resolve([{ key: undefined, value: undefined }]);
    });
    expect(await storageManager.healthCheck()).toBeFalsy();

    jest.spyOn((storageManager as any).storage, 'data').mockImplementationOnce(() => {
      throw new Error('Health check failed');
    });
    expect(await storageManager.healthCheck()).toBeFalsy();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Health check failed for invalid data: {}');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Health check failed:', expect.any(Error));
    (storageManager as any).storage.options.logging = false;
  });

  it('storageManager should fail healthCheck (no logging)', async () => {
    expect(storageManager).toBeDefined();
    if (!storageManager) return;
    jest.spyOn((storageManager as any).storage, 'data').mockImplementationOnce(() => {
      return Promise.resolve(null);
    });
    expect(await storageManager.healthCheck()).toBeFalsy();

    jest.spyOn((storageManager as any).storage, 'data').mockImplementationOnce(() => {
      return Promise.resolve([{ key: undefined, value: undefined }]);
    });
    expect(await storageManager.healthCheck()).toBeFalsy();

    jest.spyOn((storageManager as any).storage, 'data').mockImplementationOnce(() => {
      throw new Error('Health check failed');
    });
    expect(await storageManager.healthCheck()).toBeFalsy();
  });

  it('storageManager should fail healthCheck when keys or values length does not match data length', async () => {
    expect(storageManager).toBeDefined();
    if (!storageManager) return;

    jest.spyOn((storageManager as any).storage, 'data').mockImplementationOnce(() => {
      return Promise.resolve([{ key: 'test-key', value: 'test-value' }]);
    });
    jest.spyOn((storageManager as any).storage, 'keys').mockImplementationOnce(() => {
      return Promise.resolve([]);
    });
    expect(await storageManager.healthCheck()).toBeFalsy();

    jest.spyOn((storageManager as any).storage, 'data').mockImplementationOnce(() => {
      return Promise.resolve([{ key: 'test-key', value: 'test-value' }]);
    });
    jest.spyOn((storageManager as any).storage, 'keys').mockImplementationOnce(() => {
      return Promise.resolve(['test-key']);
    });
    jest.spyOn((storageManager as any).storage, 'values').mockImplementationOnce(() => {
      return Promise.resolve([]);
    });
    expect(await storageManager.healthCheck()).toBeFalsy();
  });

  it('should not start writeInterval with writeQueue = false', async () => {
    await fsPromises.rm(customDir1, { recursive: true, force: true });
    const customOptions = { dir: customDir1, writeQueue: false, expiredInterval: undefined };
    storageManager = new NodeStorageManager(customOptions);
    storage = await storageManager.createStorage('testStorage');
    expect((storageManager as any).storage._expiredKeysInterval).toBeUndefined();
    expect((storageManager as any).storage._writeQueueInterval).toBeUndefined();
    expect((storage as any).storage._expiredKeysInterval).toBeUndefined();
    expect((storage as any).storage._writeQueueInterval).toBeUndefined();

    await storage.set('key', 'Abc');
    expect(await (storage as any).storage.length()).toEqual(1);
    await storage.clear();
    expect(await (storage as any).storage.length()).toEqual(0);

    await storage.close();
    await storageManager.close();
  });

  it('should start writeInterval with writeQueue = true', async () => {
    await fsPromises.rm(customDir2, { recursive: true, force: true });
    const customOptions = { dir: customDir2, writeQueue: true, expiredInterval: undefined };
    storageManager = new NodeStorageManager(customOptions);
    storage = await storageManager.createStorage('testStorage');
    expect((storageManager as any).storage._expiredKeysInterval).toBeUndefined();
    expect((storageManager as any).storage._writeQueueInterval).toBeDefined();
    expect((storage as any).storage._expiredKeysInterval).toBeUndefined();
    expect((storage as any).storage._writeQueueInterval).toBeDefined();

    await storage.set('key', 'Abc');
    expect(await (storage as any).storage.length()).toEqual(1);
    await storage.clear();
    expect(await (storage as any).storage.length()).toEqual(0);

    await storage.close();
    await storageManager.close();
  });
});
