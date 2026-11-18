/**
 * @file src/replacer.ts
 * @description JSON serialization with BigInt support and reserved-prefix string escaping
 * @author Luca Liguori
 * @created 2026-10-23
 * @version 1.0.0
 * @license Apache-2.0
 *
 * Copyright 2024, 2025, 2026 Luca Liguori.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const reservedPrefix = '__node_persist__:';
const bigintPrefix = `${reservedPrefix}bigint:`;
const stringPrefix = `${reservedPrefix}string:`;

/**
 * Serialize a value as JSON, preserving BigInts and escaping reserved-prefix strings.
 *
 * @param {unknown} data - The value to serialize.
 * @returns {string | undefined} The JSON text, or undefined for unsupported root values.
 * @throws {TypeError} When the value contains a circular reference.
 */
export function stringify(data: unknown): string | undefined {
  return JSON.stringify(data, (_key: string, value: unknown): unknown => {
    if (typeof value === 'bigint') return `${bigintPrefix}${value.toString()}`;
    if (typeof value === 'string' && value.startsWith(reservedPrefix)) return `${stringPrefix}${value}`;
    return value;
  });
}

/**
 * Parse JSON, restoring BigInts and escaped reserved-prefix strings.
 *
 * @param {string} text - The JSON text to parse.
 * @returns {unknown} The decoded value.
 * @throws {SyntaxError} When the text is not valid JSON.
 */
export function parse(text: string): unknown {
  return JSON.parse(text, (_key: string, value: unknown): unknown => {
    if (typeof value !== 'string') return value;
    if (value.startsWith(stringPrefix)) return value.slice(stringPrefix.length);
    if (value.startsWith(bigintPrefix)) {
      const digits = value.slice(bigintPrefix.length);
      if (/^(?:0|-?[1-9]\d*)$/.test(digits)) return BigInt(digits);
    }
    return value;
  });
}
