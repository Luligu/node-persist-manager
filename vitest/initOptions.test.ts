/**
 * @file vitest/initOptions.test.ts
 * @description This file contains the tests for the NodeStorageManager init options.
 * @author Luca Liguori
 */

import path from 'node:path';

import { vi } from 'vitest';

import { NodeStorageManager } from '../src/nodeStorage.js';
import { parse, stringify } from '../src/replacer.js';
import { SqliteStorage } from '../src/sqliteStorage.js';

// Mock the database opening so that no directory is created
const openSpy = vi.spyOn(SqliteStorage.prototype as any, 'open').mockImplementation(() => {});

describe('NodeStorageManager', () => {
  const defaultDir = path.join(process.cwd(), 'node_storage');
  const customDir = path.join('.cache', 'vitest', 'custom_dir');

  beforeAll(() => {
    // Spy on and mock console.log
    vi.spyOn(console, 'log').mockImplementation((...args: any[]) => {
      //
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create and initialize storage with default options', () => {
    const storageManager = new NodeStorageManager();
    expect((storageManager as any).storage.options).toEqual({
      dir: defaultDir,
      logging: false,
      writeQueue: false,
      expiredInterval: void 0,
      stringify,
      parse,
    });
    expect((storageManager as any).storage.file).toEqual(path.join(defaultDir, 'storage.sqlite'));
  });

  it('should preserve custom callbacks when both are provided', () => {
    const storageManager = new NodeStorageManager({ stringify: JSON.stringify, parse: JSON.parse });
    expect((storageManager as any).storage.options).toEqual(expect.objectContaining({ stringify: JSON.stringify, parse: JSON.parse }));
  });

  it('should throw before creating storage when only stringify is provided', () => {
    expect(() => new NodeStorageManager({ stringify: JSON.stringify })).toThrow(new TypeError('stringify and parse must be provided together'));
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('should throw before creating storage when only parse is provided', () => {
    expect(() => new NodeStorageManager({ parse: JSON.parse })).toThrow(new TypeError('stringify and parse must be provided together'));
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('should use default callbacks when options explicitly contain undefined', () => {
    const storageManager = new NodeStorageManager({ stringify: undefined, parse: undefined });
    expect((storageManager as any).storage.options).toEqual(expect.objectContaining({ stringify, parse }));
  });

  it('should merge custom init options with defaults', () => {
    const customOptions = { dir: customDir, logging: true };
    const expectedOptions = {
      dir: customDir,
      logging: true,
      writeQueue: false,
      expiredInterval: void 0,
      stringify,
      parse,
    };
    const storageManager = new NodeStorageManager(customOptions);
    expect((storageManager as any).storage.options).toEqual(expectedOptions);
  });
});
