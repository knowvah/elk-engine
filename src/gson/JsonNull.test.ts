// SPDX-License-Identifier: EPL-2.0
// Contract tests beyond the gson.json rows (driven in JsonElement.test.ts).
import { describe, expect, it } from 'vitest';
import { JsonNull } from './JsonNull.js';
import { JsonPrimitive } from './JsonPrimitive.js';

describe('JsonNull', () => {
  it('equals only JsonNull and has a constant hash code', () => {
    expect(JsonNull.INSTANCE.equals(JsonNull.INSTANCE)).toBe(true);
    expect(JsonNull.INSTANCE.equals(new JsonPrimitive('null'))).toBe(false);
    expect(JsonNull.INSTANCE.hashCode()).toBe(JsonNull.INSTANCE.hashCode());
  });
});
