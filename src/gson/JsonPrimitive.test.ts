// SPDX-License-Identifier: EPL-2.0
// Contract tests beyond the gson.json rows (driven in JsonElement.test.ts).
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../java/lang/UnsupportedOperationException.js';
import { JsonNull } from './JsonNull.js';
import { JsonPrimitive } from './JsonPrimitive.js';

describe('JsonPrimitive', () => {
  it('is its own primitive view', () => {
    const p = new JsonPrimitive('x');
    expect(p.getAsJsonPrimitive()).toBe(p);
    expect(p.isJsonPrimitive()).toBe(true);
  });

  it('returns the number of a number primitive', () => {
    expect(JsonPrimitive.ofInt(7).getAsNumber().toString()).toBe('7');
    expect(JsonPrimitive.ofDouble(7).getAsNumber().doubleValue()).toBe(7);
  });

  it('refuses the number of a boolean with the recorded message', () => {
    expect(() => new JsonPrimitive(true).getAsNumber()).toThrow(
      new UnsupportedOperationException('Primitive is neither a number nor a string'),
    );
  });

  it('equals itself and only primitives of the same value', () => {
    const p = JsonPrimitive.ofDouble(NaN);
    expect(p.equals(p)).toBe(true);
    expect(p.equals(JsonPrimitive.ofDouble(1))).toBe(false);
    expect(JsonPrimitive.ofInt(1).equals(JsonPrimitive.ofInt(1))).toBe(true);
    expect(JsonPrimitive.ofInt(1).equals(JsonPrimitive.ofInt(2))).toBe(false);
    expect(JsonPrimitive.ofDouble(2).equals(JsonPrimitive.ofDouble(1))).toBe(false);
    expect(new JsonPrimitive('a').equals(new JsonPrimitive('b'))).toBe(false);
    expect(new JsonPrimitive(true).equals(new JsonPrimitive('true'))).toBe(false);
    expect(JsonPrimitive.ofInt(1).equals(JsonNull.INSTANCE)).toBe(false);
  });

  it('hashes per the Boolean, String, Long and Double hashCode Javadoc', () => {
    expect(new JsonPrimitive(true).hashCode()).toBe(1231);
    expect(new JsonPrimitive(false).hashCode()).toBe(1237);
    expect(new JsonPrimitive('a').hashCode()).toBe('a'.charCodeAt(0));
    expect(JsonPrimitive.ofInt(5).hashCode()).toBe(5);
  });
});
