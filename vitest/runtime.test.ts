/**
 * @file vitest/runtime.test.ts
 * @description This file contains the tests for the selection of the SQLite driver of the running runtime.
 * @author Luca Liguori
 */

import { vi } from 'vitest';

const requested: string[] = [];

// Emulate bun:sqlite with node:sqlite
vi.mock('node:module', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:module')>();
  return {
    createRequire: (url: string) => {
      const require = actual.createRequire(url);
      return (id: string): unknown => {
        requested.push(id);
        // oxlint-disable-next-line import/no-dynamic-require -- forward the other modules to the real require
        if (id !== 'bun:sqlite') return require(id);
        const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');
        return {
          // oxlint-disable-next-line typescript/no-extraneous-class -- emulate the bun:sqlite Database constructor
          Database: class {
            constructor(file: string, options: { create: boolean }) {
              expect(options).toEqual({ create: true });
              return new DatabaseSync(file);
            }
          },
        };
      };
    },
  };
});

const { openDatabase } = await import('../src/sqliteStorage.js');

describe('openDatabase', () => {
  it('should use node:sqlite on Node.js', () => {
    const database = openDatabase(':memory:');
    database.close();
    expect(requested).toEqual(['node:sqlite']);
  });

  it('should use bun:sqlite on Bun', () => {
    Object.defineProperty(process.versions, 'bun', { value: '1.4.2', configurable: true });
    try {
      const database = openDatabase(':memory:');
      database.close();
      expect(requested).toEqual(['node:sqlite', 'bun:sqlite']);
    } finally {
      delete (process.versions as Record<string, string | undefined>).bun;
    }
  });
});
