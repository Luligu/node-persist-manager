/**
 * @file vitest/initOptions.test.ts
 * @description This file contains the tests for the NodeStorageManager init options.
 * @author Luca Liguori
 */

import path from 'node:path';

import { vi } from 'vitest';

import { NodeStorageManager } from '../src/nodeStorage.js';
import { SqliteStorage } from '../src/sqliteStorage.js';

// Mock the database opening so that no directory is created
vi.spyOn(SqliteStorage.prototype as any, 'open').mockImplementation(() => {});

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
    });
    expect((storageManager as any).storage.file).toEqual(path.join(defaultDir, 'storage.sqlite'));
  });

  it('should merge custom init options with defaults', () => {
    const customOptions = { dir: customDir, logging: true };
    const expectedOptions = {
      dir: customDir,
      logging: true,
      writeQueue: false,
      expiredInterval: void 0,
    };
    const storageManager = new NodeStorageManager(customOptions);
    expect((storageManager as any).storage.options).toEqual(expectedOptions);
  });
});
