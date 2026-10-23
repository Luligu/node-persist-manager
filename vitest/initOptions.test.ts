/**
 * @file vitest/initOptions.test.ts
 * @description This file contains the tests for the NodeStorageManager init options.
 * @author Luca Liguori
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';

import NodePersist, { type LocalStorage } from 'node-persist';
import { vi } from 'vitest';

import { NodeStorageManager } from '../src/nodeStorage.js';
import { parse, stringify } from '../src/replacer.js';

// Mock node-persist module
vi.spyOn(NodePersist, 'create').mockImplementation((options) => {
  return {
    initSync: vi.fn<() => void>(),
    options,
  } as unknown as LocalStorage;
});

// Mock path module
vi.spyOn(path, 'join').mockImplementation((...args) => args.join('/'));

// Mock fs/promises module
vi.spyOn(fsPromises, 'rm').mockResolvedValue(void 0);

describe('NodeStorageManager', () => {
  const defaultDir = process.cwd() + '/node_storage';
  const customDir = path.join('.cache', 'vitest', 'custom_dir');
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    // Spy on and mock console.log
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation((...args: any[]) => {
      //
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create and initialize storage with default options', () => {
    new NodeStorageManager();
    expect(NodePersist.create).toHaveBeenCalledWith({
      dir: defaultDir,
      logging: false,
      writeQueue: false,
      expiredInterval: void 0,
      stringify,
      parse,
    });
  });

  it('should preserve custom callbacks when both are provided', () => {
    new NodeStorageManager({ stringify: JSON.stringify, parse: JSON.parse });
    expect(NodePersist.create).toHaveBeenLastCalledWith(expect.objectContaining({ stringify: JSON.stringify, parse: JSON.parse }));
  });

  it('should throw before creating storage when only stringify is provided', () => {
    expect(() => new NodeStorageManager({ stringify: JSON.stringify })).toThrow(new TypeError('stringify and parse must be provided together'));
    expect(NodePersist.create).not.toHaveBeenCalled();
  });

  it('should throw before creating storage when only parse is provided', () => {
    expect(() => new NodeStorageManager({ parse: JSON.parse })).toThrow(new TypeError('stringify and parse must be provided together'));
    expect(NodePersist.create).not.toHaveBeenCalled();
  });

  it('should use default callbacks when options explicitly contain undefined', () => {
    new NodeStorageManager({ stringify: undefined, parse: undefined });
    expect(NodePersist.create).toHaveBeenLastCalledWith(expect.objectContaining({ stringify, parse }));
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
    new NodeStorageManager(customOptions);
    expect(NodePersist.create).toHaveBeenCalledWith(expectedOptions);
  });
});
