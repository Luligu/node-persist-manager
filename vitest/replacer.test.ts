/**
 * @file vitest/replacer.test.ts
 * @description Tests BigInt persistence using a reserved string prefix and default JSON callbacks.
 * @author Luca Liguori
 */

import { createHash } from 'node:crypto';
import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { NodeStorageManager } from '../src/nodeStorage.js';
import { parse, stringify } from '../src/replacer.js';

describe('NodeStorageManager with a BigInt replacer and reviver', () => {
  it('should preserve ordinary JSON values when using the exported callbacks', () => {
    const item = { value: [1, 'text', null, true], nested: { empty: {} } };
    expect(parse(stringify(item) ?? '')).toStrictEqual(item);
    expect(stringify(void 0)).toBeUndefined();
    expect(() => parse('{')).toThrow(SyntaxError);
  });

  it('should leave malformed BigInt markers unchanged when parsing JSON', () => {
    for (const digits of ['', 'invalid', '01', '-0', '1.5', '+1']) {
      const value = `__node_persist__:bigint:${digits}`;
      expect(parse(JSON.stringify(value))).toBe(value);
    }
  });

  it('should omit unsupported properties and replace unsupported array values with null when serializing', () => {
    const symbol = Symbol('value');
    const symbolKey = Symbol('key');
    const callback = (): string => 'function result';
    const item = {
      symbol,
      callback,
      missing: void 0,
      [symbolKey]: 'symbol-keyed property',
      values: [symbol, callback, void 0, Number.NaN, Infinity, -Infinity, 123n],
      kept: 'ordinary property',
    };

    expect(stringify(symbol)).toBeUndefined();
    expect(stringify(callback)).toBeUndefined();
    expect(parse(stringify(item) ?? '')).toStrictEqual({
      values: [null, null, null, null, null, null, 123n],
      kept: 'ordinary property',
    });
  });

  it('should use JSON representations when serializing dates, collections, and typed arrays', () => {
    const item = {
      date: new Date('2026-01-02T03:04:05.000Z'),
      invalidDate: new Date(Number.NaN),
      map: new Map([['key', 123]]),
      set: new Set([1, 2]),
      regexp: /example/gi,
      bytes: new Uint8Array([0, 127, 255]),
      negativeZero: -0,
    };

    expect(parse(stringify(item) ?? '')).toStrictEqual({
      date: '2026-01-02T03:04:05.000Z',
      invalidDate: null,
      map: {},
      set: {},
      regexp: {},
      bytes: { 0: 0, 1: 127, 2: 255 },
      negativeZero: 0,
    });
  });

  it('should throw a TypeError when serializing a circular reference', () => {
    const item: { name: string; self?: unknown } = { name: 'circular' };
    item.self = item;

    expect(() => stringify(item)).toThrow(TypeError);
  });

  it('should preserve BigInts and reserved-prefix strings when storage is reopened', async () => {
    const dir = path.join('.cache', 'vitest', 'replacer_dir');
    const reservedPrefix = '__node_persist__:';
    const bigintPrefix = `${reservedPrefix}bigint:`;
    const stringPrefix = `${reservedPrefix}string:`;
    const options = { dir };
    const item = {
      zero: 0n,
      positive: 9007199254740993n,
      negative: -9007199254740993n,
      huge: 12345678901234567890123456789012345678901234567890n,
      nested: { values: [1n, -2n, { counter: 3n }] },
      ordinaryValues: [42, 0.125, true, false, null, '', '123', '123n'],
      reservedStrings: [reservedPrefix, `${bigintPrefix}123`, `${bigintPrefix}invalid`, `${stringPrefix}text`, `${stringPrefix}${bigintPrefix}456`],
      [bigintPrefix]: 'prefixed object key',
    };

    await fsPromises.rm(dir, { recursive: true, force: true });
    let storageManager = new NodeStorageManager(options);
    let storage = await storageManager.createStorage('testStorage');

    try {
      await storage.set('complexKey', item);
      await storage.set('bigintKey', item.huge);
      expect(await storage.get<typeof item>('complexKey')).toStrictEqual(item);
      expect(await storage.get<bigint>('bigintKey')).toBe(item.huge);

      const fileName = createHash('sha256').update('complexKey').digest('hex');
      const text = await fsPromises.readFile(path.join(dir, '.testStorage', fileName), 'utf8');
      const raw = JSON.parse(text) as { value: { positive: string; reservedStrings: string[] } };
      expect(raw.value.positive).toBe(`${bigintPrefix}9007199254740993`);
      expect(raw.value.reservedStrings[1]).toBe(`${stringPrefix}${bigintPrefix}123`);

      await storage.close();
      await storageManager.close();
      storageManager = new NodeStorageManager(options);
      storage = await storageManager.createStorage('testStorage');

      expect(await storage.get<typeof item>('complexKey')).toStrictEqual(item);
      expect(await storage.get<bigint>('bigintKey')).toBe(item.huge);
      expect(await storage.data()).toStrictEqual({ complexKey: item, bigintKey: item.huge });
      expect(await storage.values()).toEqual(expect.arrayContaining([item, item.huge]));
      expect(await storage.healthCheck()).toBe(true);
      expect(await storageManager.healthCheck()).toBe(true);
    } finally {
      await storage.close();
      await storageManager.close();
    }
  });
});
