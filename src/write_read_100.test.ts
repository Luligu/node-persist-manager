/* eslint-disable no-console */
import fsPromises from 'node:fs/promises';

import NodePersist, { LocalStorage } from 'node-persist';
import { jest } from '@jest/globals';

import { NodeStorageManager, NodeStorage } from './nodeStorage.ts';

interface DatumTest {
  key: string;
  value: any;
  ttl?: number;
}

describe('NodeStorageManager with NodeStorage', () => {
  let consoleLogSpy: jest.SpiedFunction<typeof console.log>;
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;
  let storageManager: NodeStorageManager;
  let storage: NodeStorage;
  const isDevContainer = process.env.REMOTE_CONTAINERS === 'true';
  const dir = isDevContainer ? 'node_modules/custom_dir_3' : 'custom_dir_3';

  beforeAll(async () => {
    // Spy on and mock console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation((...args: any[]) => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {});
    await fsPromises.rm(dir, { recursive: true, force: true });
    storageManager = new NodeStorageManager({ dir: dir, logging: true });
    storage = await storageManager.createStorage('testStorage');
    await storage.clear();
  });

  it('not existing key should return the default', async () => {
    const returnItem = await storage.get<number>('noKey', 999);
    expect(typeof returnItem).toEqual('number');
    expect(returnItem).toEqual(999);
  });

  it('not existing key should return false', async () => {
    expect(await storage.includes('noKey')).toEqual(false);
    expect(await storage.has('noKey')).toEqual(false);
  });

  it('existing key should return true', async () => {
    await storage.set<number>('existKey', 9876543210);
    expect(await storage.includes('existKey')).toEqual(true);
    expect(await storage.has('existKey')).toEqual(true);
    await storage.remove('existKey');
    expect(await storage.includes('existKey')).toEqual(false);
    expect(await storage.has('existKey')).toEqual(false);
  });

  it('should return a number', async () => {
    const item = 0.2345521;
    await storage.set<number>('numberKey', item);
    const returnItem = await storage.get<number>('numberKey', 999);
    expect(typeof returnItem).toEqual('number');
    expect(item).toEqual(returnItem);
  });

  it('should return a string', async () => {
    const item = '0.2345521';
    await storage.set<string>('stringKey', item);
    const returnItem = await storage.get<string>('stringKey', '999');
    expect(typeof returnItem).toEqual('string');
    expect(item).toEqual(returnItem);
  });

  it('should return a boolean', async () => {
    const item = true;
    await storage.set<boolean>('booleanKey', item);
    const returnItem = await storage.get<boolean>('booleanKey', false);
    expect(typeof returnItem).toEqual('boolean');
    expect(item).toEqual(returnItem);
  });

  it('should return undefined', async () => {
    const item = undefined;
    await storage.set('undefinedKey', item);
    const returnItem = await storage.get('undefinedKey');
    expect(typeof returnItem).toEqual('undefined');
    expect(returnItem).toEqual(item);
  });

  it('should return null', async () => {
    const item = null;
    await storage.set('nullKey', item);
    const returnItem = await storage.get('nullKey');
    expect(returnItem).toEqual(item);
  });

  it('should return string array', async () => {
    const item = ['abc', 'def', 'ghj'];
    await storage.set('stringArrayKey', item);
    const returnItem = await storage.get('stringArrayKey', '1234345');
    console.log('string[]:', returnItem);
    expect(returnItem).toEqual(item);
    expect(typeof returnItem).toEqual('object');
  });

  it('should return string array of 1', async () => {
    const item = ['abc'];
    await storage.set('stringArrayKey', item);
    const returnItem = await storage.get('stringArrayKey', '1234345');
    console.log('string1[]:', returnItem);
    expect(returnItem).toEqual(item);
    expect(typeof returnItem).toEqual('object');
  });

  it('should return empty string array', async () => {
    const item: string[] = [];
    await storage.set('stringArrayKey', item);
    const returnItem = await storage.get('stringArrayKey', '1234345');
    console.log('string[]=[]:', returnItem);
    expect(returnItem).toEqual(item);
    expect(typeof returnItem).toEqual('object');
  });

  it('should return an object', async () => {
    const item = { abc: 'abc', n123: 234, undef: undefined, nil: null };
    await storage.set<object>('objectKey', item);
    const returnItem = await storage.get<object>('objectKey');
    console.log('object:', JSON.stringify(returnItem));
    expect(returnItem).toEqual(item);
    expect(typeof returnItem).toEqual('object');
  });

  it('should return an interface', async () => {
    const item: DatumTest = { key: 'abc', value: 234 };
    await storage.set<DatumTest>('objectKey', item);
    const returnItem = await storage.get<DatumTest>('objectKey');
    console.log('object:', JSON.stringify(returnItem));
    expect(returnItem).toEqual(item);
    expect(typeof returnItem).toEqual('object');
    expect(typeof returnItem).toEqual(typeof item);
  });

  it('should return the data', async () => {
    const data = {
      booleanKey: true,
      nullKey: null,
      numberKey: 0.2345521,
      objectKey: {
        key: 'abc',
        value: 234,
      },
      stringArrayKey: [],
      stringKey: '0.2345521',
      undefinedKey: undefined,
    };
    expect(await storage.data()).toEqual(data);
  });

  it('should return the keys', async () => {
    const keys = ['stringArrayKey', 'stringKey', 'nullKey', 'undefinedKey', 'objectKey', 'numberKey', 'booleanKey'];
    expect(await storage.keys()).toEqual(keys);
  });

  it('should return the values', async () => {
    const values = [[], '0.2345521', null, undefined, { key: 'abc', value: 234 }, 0.2345521, true];
    expect(await storage.values()).toEqual(values);
  });

  it('should log the storage keys', async () => {
    const size = await storage.logStorage();
    expect(size).toEqual(7);
    expect(await storage.size()).toEqual(7);
  });

  it('should write and read 100 keys correctly', async () => {
    const writePromises: Promise<NodePersist.WriteFileResult>[] = [];
    for (let i = 0; i < 100; i++) {
      const key = `Key${i.toString().padStart(3, '0')}`; // Generates Key000, Key001, ..., Key099
      const value = `Value${i}-0123456789-abcdefghijklmnopqrstuvwxyz`; // Generates Value0, Value1, ..., Value99
      writePromises.push(storage.set(key, value));
    }

    // Wait for all write operations to complete
    await Promise.all(writePromises);

    // Now, read back the values to ensure they were written correctly
    const readPromises: Promise<void>[] = [];
    for (let i = 0; i < 100; i++) {
      const key = `Key${i.toString().padStart(3, '0')}`;
      readPromises.push(storage.get(key));
    }

    const values = await Promise.all(readPromises);
    // Verify each value is as expected
    values.forEach((value, index) => {
      expect(value).toEqual(`Value${index}-0123456789-abcdefghijklmnopqrstuvwxyz`);
    });

    expect(await (storage as any).storage.length()).toEqual(100 + 7); // 100 keys + 7 initial keys
  });

  it('storageManager healthCheck should fail with logging', async () => {
    expect(storageManager).toBeDefined();
    if (!storageManager) return;
    (storageManager as any).storage.options.logging = true;

    jest.spyOn((storageManager as any).storage, 'data').mockImplementationOnce(() => {
      return Promise.resolve(null);
    });
    expect(await NodeStorage.healthCheck((storageManager as any).storage)).toBeFalsy();

    jest.spyOn((storageManager as any).storage, 'data').mockImplementationOnce(() => {
      return Promise.resolve([{ key: undefined, value: undefined }]);
    });
    expect(await NodeStorage.healthCheck((storageManager as any).storage)).toBeFalsy();

    jest.spyOn((storageManager as any).storage, 'data').mockImplementationOnce(() => {
      throw new Error('Health check failed');
    });
    expect(await NodeStorage.healthCheck((storageManager as any).storage)).toBeFalsy();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Health check failed for invalid data: {}');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Health check failed:', expect.any(Error));
  });

  it('storageManager healthCheck should fail without logging', async () => {
    expect(storageManager).toBeDefined();
    if (!storageManager) return;
    (storageManager as any).storage.options.logging = false;

    jest.spyOn((storageManager as any).storage, 'data').mockImplementationOnce(() => {
      return Promise.resolve(null);
    });
    expect(await NodeStorage.healthCheck((storageManager as any).storage)).toBeFalsy();

    jest.spyOn((storageManager as any).storage, 'data').mockImplementationOnce(() => {
      return Promise.resolve([{ key: undefined, value: undefined }]);
    });
    expect(await NodeStorage.healthCheck((storageManager as any).storage)).toBeFalsy();

    jest.spyOn((storageManager as any).storage, 'data').mockImplementationOnce(() => {
      throw new Error('Health check failed');
    });
    expect(await NodeStorage.healthCheck((storageManager as any).storage)).toBeFalsy();
  });

  it('storage healthCheck should fail with logging', async () => {
    expect(storage).toBeDefined();
    if (!storage) return;
    (storage as any).storage.options.logging = true;

    jest.spyOn((storage as any).storage, 'data').mockImplementationOnce(() => {
      return Promise.resolve(null);
    });
    expect(await NodeStorage.healthCheck((storage as any).storage)).toBeFalsy();

    jest.spyOn((storage as any).storage, 'data').mockImplementationOnce(() => {
      return Promise.resolve([{ key: undefined, value: undefined }]);
    });
    expect(await NodeStorage.healthCheck((storage as any).storage)).toBeFalsy();

    jest.spyOn((storage as any).storage, 'data').mockImplementationOnce(() => {
      throw new Error('Health check failed');
    });
    expect(await NodeStorage.healthCheck((storage as any).storage)).toBeFalsy();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Health check failed for invalid data: {}');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Health check failed:', expect.any(Error));
  });

  it('storage healthCheck should fail without logging', async () => {
    expect(storage).toBeDefined();
    if (!storage) return;
    (storage as any).storage.options.logging = false;

    jest.spyOn((storage as any).storage, 'data').mockImplementationOnce(() => {
      return Promise.resolve(null);
    });
    expect(await NodeStorage.healthCheck((storage as any).storage)).toBeFalsy();

    jest.spyOn((storage as any).storage, 'data').mockImplementationOnce(() => {
      return Promise.resolve([{ key: undefined, value: undefined }]);
    });
    expect(await NodeStorage.healthCheck((storage as any).storage)).toBeFalsy();

    jest.spyOn((storage as any).storage, 'data').mockImplementationOnce(() => {
      throw new Error('Health check failed');
    });
    expect(await NodeStorage.healthCheck((storage as any).storage)).toBeFalsy();

    jest.spyOn((storage as any).storage, 'data').mockImplementationOnce(() => {
      return Promise.resolve([{ key: 'booleanKey', value: true }]);
    });
    jest.spyOn((storage as any).storage, 'keys').mockImplementationOnce(() => {
      return Promise.resolve([]);
    });
    expect(await NodeStorage.healthCheck((storage as any).storage)).toBeFalsy();

    jest.spyOn((storage as any).storage, 'data').mockImplementationOnce(() => {
      return Promise.resolve([{ key: 'booleanKey', value: true }]);
    });
    jest.spyOn((storage as any).storage, 'keys').mockImplementationOnce(() => {
      return Promise.resolve(['booleanKey']);
    });
    jest.spyOn((storage as any).storage, 'values').mockImplementationOnce(() => {
      return Promise.resolve([]);
    });
    expect(await NodeStorage.healthCheck((storage as any).storage)).toBeFalsy();
  });

  it('storageManager should pass healthCheck', async () => {
    expect(storageManager).toBeDefined();
    if (!storageManager) return;
    expect(await NodeStorage.healthCheck((storageManager as any).storage)).toBeTruthy();
  });

  it('storage should pass healthCheck', async () => {
    expect(storage).toBeDefined();
    if (!storage) return;
    expect(await NodeStorage.healthCheck((storage as any).storage)).toBeTruthy();
  });

  it('should close the storage', async () => {
    await storageManager.close();
    await storage.close();
    expect((storageManager as any).storage._writeQueueInterval).toBeUndefined();
    expect((storageManager as any).storage._expiredKeysInterval).toBeUndefined();
    expect((storage as any).storage._writeQueueInterval).toBeUndefined();
    expect((storage as any).storage._expiredKeysInterval).toBeUndefined();
  });
});
