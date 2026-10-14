// SPDX-License-Identifier: EPL-2.0
// Element-building read beyond the gson.json `parse` rows (driven in ../JsonParser.test.ts).
import { describe, expect, it } from 'vitest';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { JsonReader } from '../stream/JsonReader.js';
import { readElement } from './JsonElementReader.js';

describe('readElement', () => {
  it('reads one value and leaves the reader after it', () => {
    const reader = new JsonReader('[1] 2');
    reader.setLenient(true);
    expect(readElement(reader).toString()).toBe('[1]');
    expect(readElement(reader).toString()).toBe('2');
  });

  it('rejects a reader with no value left', () => {
    const reader = new JsonReader('1');
    readElement(reader);
    expect(() => readElement(reader)).toThrow(new IllegalStateException('Unexpected token: END_DOCUMENT'));
  });

  it('reads deeply nested values without recursion', () => {
    const depth = 20_000;
    const reader = new JsonReader('['.repeat(depth) + ']'.repeat(depth));
    let element = readElement(reader);
    let levels = 1;
    while (element.getAsJsonArray().size() > 0) {
      element = element.getAsJsonArray().get(0);
      levels++;
    }
    expect(levels).toBe(depth);
  });
});
