/**
 * @file vitest/storage_manager.test.ts
 * @description This file contains the tests for the NodeStorageManager and NodeStorage classes.
 * @author Luca Liguori
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { vi } from 'vitest';

import { NodeStorage, NodeStorageManager } from '../src/nodeStorage.js';

// Mock fs/promises module
const rmSpy = vi.spyOn(fsPromises, 'rm');

describe('NodeStorageManager with NodeStorage', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let storageManager: NodeStorageManager;
  let storage: NodeStorage;
  const storageDir = path.join('.cache', 'vitest', 'node_storage');
  const customDir1 = path.join('.cache', 'vitest', 'custom_dir_1');
  const customDir2 = path.join('.cache', 'vitest', 'custom_dir_2');

  beforeAll(async () => {
    // Spy on and mock console.log
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation((...args: any[]) => {
      // Mock implementation or empty function
    });
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((...args: any[]) => {
      // Mock implementation or empty function
    });
    await fsPromises.rm(storageDir, { recursive: true, force: true });
    storageManager = new NodeStorageManager({ dir: storageDir });
  });

  it('should create and initialize storage with default options', () => {
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

  it('should return the storageManager key value', async () => {
    const keys = await storageManager.get('storageNames');
    expect(keys).toEqual(['testStorage']);
  });

  it('should return undefined for non-existing key', async () => {
    const keys = await storageManager.get('nonExistingKey');
    expect(keys).toBeUndefined();
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
    vi.spyOn((storageManager as any).storage, 'data').mockResolvedValueOnce(null);
    expect(await storageManager.healthCheck()).toBeFalsy();

    vi.spyOn((storageManager as any).storage, 'data').mockResolvedValueOnce([{ key: undefined, value: undefined }]);
    expect(await storageManager.healthCheck()).toBeFalsy();

    vi.spyOn((storageManager as any).storage, 'data').mockRejectedValueOnce(new Error('Health check failed'));
    expect(await storageManager.healthCheck()).toBeFalsy();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Health check failed for invalid data: {}');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Health check failed:', expect.any(Error));

    consoleErrorSpy.mockClear();
    const managedStorage = storageManager as unknown as { storage: { data(): Promise<unknown[]> } };
    vi.spyOn(managedStorage.storage, 'data').mockResolvedValueOnce([{ value: 123n }]);
    expect(await storageManager.healthCheck()).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledExactlyOnceWith('Health check failed for invalid data: {"value":"__node_persist__:bigint:123"}');
    (storageManager as any).storage.options.logging = false;
  });

  it('storageManager should fail healthCheck (no logging)', async () => {
    expect(storageManager).toBeDefined();
    if (!storageManager) return;
    vi.spyOn((storageManager as any).storage, 'data').mockResolvedValueOnce(null);
    expect(await storageManager.healthCheck()).toBeFalsy();

    vi.spyOn((storageManager as any).storage, 'data').mockResolvedValueOnce([{ key: undefined, value: undefined }]);
    expect(await storageManager.healthCheck()).toBeFalsy();

    vi.spyOn((storageManager as any).storage, 'data').mockRejectedValueOnce(new Error('Health check failed'));
    expect(await storageManager.healthCheck()).toBeFalsy();
  });

  it('storageManager should fail healthCheck when keys or values length does not match data length', async () => {
    expect(storageManager).toBeDefined();
    if (!storageManager) return;

    vi.spyOn((storageManager as any).storage, 'data').mockResolvedValueOnce([{ key: 'test-key', value: 'test-value' }]);
    vi.spyOn((storageManager as any).storage, 'keys').mockResolvedValueOnce([]);
    expect(await storageManager.healthCheck()).toBeFalsy();

    vi.spyOn((storageManager as any).storage, 'data').mockResolvedValueOnce([{ key: 'test-key', value: 'test-value' }]);
    vi.spyOn((storageManager as any).storage, 'keys').mockResolvedValueOnce(['test-key']);
    vi.spyOn((storageManager as any).storage, 'values').mockResolvedValueOnce([]);
    expect(await storageManager.healthCheck()).toBeFalsy();
  });

  it('should ignore writeQueue = false', async () => {
    await fsPromises.rm(customDir1, { recursive: true, force: true });
    const customOptions = { dir: customDir1, writeQueue: false, expiredInterval: void 0 };
    storageManager = new NodeStorageManager(customOptions);
    storage = await storageManager.createStorage('testStorage');
    expect((storageManager as any).storage.expiredKeysInterval).toBeUndefined();
    expect((storage as any).storage.expiredKeysInterval).toBeUndefined();

    await storage.set('key', 'Abc');
    expect(await storage.size()).toEqual(1);
    await storage.clear();
    expect(await storage.size()).toEqual(0);

    await storage.close();
    await storageManager.close();
  });

  it('should ignore writeQueue = true', async () => {
    await fsPromises.rm(customDir2, { recursive: true, force: true });
    const customOptions = { dir: customDir2, writeQueue: true, expiredInterval: void 0 };
    storageManager = new NodeStorageManager(customOptions);
    storage = await storageManager.createStorage('testStorage');
    expect((storageManager as any).storage.expiredKeysInterval).toBeUndefined();
    expect((storage as any).storage.expiredKeysInterval).toBeUndefined();

    await storage.set('key', 'Abc');
    expect(await storage.size()).toEqual(1);
    await storage.clear();
    expect(await storage.size()).toEqual(0);

    await storage.close();
    await storageManager.close();
  });

  it('should reopen the storage when used after close', async () => {
    storage = await storageManager.createStorage('testStorage');
    await storage.set('key', 'Abc');
    await storage.close();
    await storageManager.close();
    expect((storage as any).storage.database).toBeUndefined();
    expect(await storage.get('key')).toEqual('Abc');
    expect(await storageManager.getStorageNames()).toEqual(['testStorage']);
    await storage.close();
    await storageManager.close();
  });

  it('should close the open storages when removing a storage', async () => {
    storage = await storageManager.createStorage('testStorage');
    const otherStorage = await storageManager.createStorage('testStorage');
    await storage.set('key', 'Abc');
    await storageManager.close();
    await otherStorage.set('otherKey', 'Def');
    expect(await otherStorage.get('key')).toEqual('Abc');
    expect(await storageManager.removeStorage('testStorage')).toBe(true);
    expect((storage as any).storage.database).toBeUndefined();
    expect((otherStorage as any).storage.database).toBeUndefined();
    expect(await storageManager.getStorageNames()).toEqual([]);
    await storageManager.close();
  });

  it('should not recreate a removed storage when an old instance is used', async () => {
    storage = await storageManager.createStorage('testStorage');
    await storage.set('key', 'Abc');
    expect(await storageManager.removeStorage('testStorage')).toBe(true);
    await expect(storage.set('key2', 'Def')).rejects.toThrow('has been removed');
    await expect(storage.get('key')).rejects.toThrow('has been removed');
    await expect(fsPromises.access(path.join((storageManager as any).initOptions.dir, '.testStorage'))).rejects.toThrow();
    await storage.close(); // Closing a removed storage is safe

    // A new instance with the same name works again
    const newStorage = await storageManager.createStorage('testStorage');
    expect(await newStorage.get('key')).toBeUndefined();
    expect(await storageManager.removeStorage('testStorage')).toBe(true);
    await storageManager.close();
  });

  it('should keep the storages usable when the removal fails', async () => {
    storage = await storageManager.createStorage('testStorage');
    await storage.set('key', 'Abc');
    await storage.close(); // Windows cannot remove the directory of an open database
    await fsPromises.rm(path.join((storageManager as any).initOptions.dir, '.testStorage'), { recursive: true });
    expect(await storageManager.removeStorage('testStorage')).toBe(false);
    await storage.set('key2', 'Def');
    expect(await storage.get('key2')).toEqual('Def');
    expect(await storageManager.removeStorage('testStorage')).toBe(true);
    await storageManager.close();
  });

  it('should forget the storages that have been garbage collected', async () => {
    const firstStorage = await storageManager.createStorage('testStorage');
    const derefSpy = vi.spyOn(WeakRef.prototype, 'deref').mockImplementation(() => {});
    const secondStorage = await storageManager.createStorage('testStorage');
    expect((storageManager as any).openStorages.get('testStorage').size).toBe(1);
    // With deref mocked removeStorage cannot close the databases: close them, since Windows cannot remove the directory of an open database
    await firstStorage.close();
    await secondStorage.close();
    expect(await storageManager.removeStorage('testStorage')).toBe(true);
    derefSpy.mockRestore();
    await storageManager.close();
  });
});
