import fsPromises from 'node:fs/promises';
import path from 'node:path';

import NodePersist, { type LocalStorage } from 'node-persist';
import { vi } from 'vitest';

import { NodeStorageManager } from '../src/nodeStorage.js';

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
    });
  });

  it('should merge custom init options with defaults', () => {
    const customOptions = { dir: customDir, logging: true };
    const expectedOptions = {
      dir: customDir,
      logging: true,
      writeQueue: false,
      expiredInterval: void 0,
    };
    new NodeStorageManager(customOptions);
    expect(NodePersist.create).toHaveBeenCalledWith(expectedOptions);
  });
});
