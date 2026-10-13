// SPDX-License-Identifier: EPL-2.0
// Contract tests beyond the gson.json rows (driven in JsonElement.test.ts).
import { describe, expect, it } from 'vitest';
import { IllegalStateException } from '../java/lang/IllegalStateException.js';
import { JsonArray } from './JsonArray.js';
import { JsonNull } from './JsonNull.js';
import { JsonPrimitive } from './JsonPrimitive.js';

function arrayOf(...items: JsonPrimitive[]): JsonArray {
  const array = new JsonArray();
  for (const item of items) array.add(item);
  return array;
}

describe('JsonArray', () => {
  it('stores JsonNull for a null element and iterates in insertion order', () => {
    const array = arrayOf(new JsonPrimitive('a'));
    array.add(null);
    expect([...array]).toEqual([new JsonPrimitive('a'), JsonNull.INSTANCE]);
  });

  it('delegates the getAs conversions of a one-element array to the element', () => {
    const array = arrayOf(JsonPrimitive.ofDouble(2.5));
    expect(array.getAsDouble()).toBe(2.5);
    expect(array.getAsString()).toBe('2.5');
    expect(array.getAsNumber().doubleValue()).toBe(2.5);
    expect(arrayOf(new JsonPrimitive(true)).getAsBoolean()).toBe(true);
  });

  it('refuses the conversions of an empty array', () => {
    expect(() => new JsonArray().getAsString()).toThrow(
      new IllegalStateException('Array must have size 1, but has size 0'),
    );
  });

  it('compares element-wise', () => {
    const a = arrayOf(new JsonPrimitive('x'), new JsonPrimitive('y'));
    expect(a.equals(a)).toBe(true);
    expect(a.equals(arrayOf(new JsonPrimitive('x'), new JsonPrimitive('y')))).toBe(true);
    expect(a.equals(arrayOf(new JsonPrimitive('x')))).toBe(false);
    expect(a.equals(arrayOf(new JsonPrimitive('x'), new JsonPrimitive('z')))).toBe(false);
    expect(a.equals(new JsonPrimitive('x'))).toBe(false);
  });

  it('hashes per the List.hashCode Javadoc: 31 * h + element hash, from 1', () => {
    expect(new JsonArray().hashCode()).toBe(1);
    expect(arrayOf(new JsonPrimitive(true)).hashCode()).toBe(31 + 1231);
    expect(arrayOf(new JsonPrimitive(true), new JsonPrimitive(false)).hashCode()).toBe((31 + 1231) * 31 + 1237);
  });
});
