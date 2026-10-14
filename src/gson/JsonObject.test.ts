// SPDX-License-Identifier: EPL-2.0
// Contract tests beyond the gson.json rows (driven in JsonElement.test.ts).
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../java/lang/UnsupportedOperationException.js';
import { JsonArray } from './JsonArray.js';
import { JsonObject } from './JsonObject.js';

function objectOf(entries: Readonly<Record<string, boolean>>): JsonObject {
  const object = new JsonObject();
  for (const [name, value] of Object.entries(entries)) object.addProperty(name, value);
  return object;
}

describe('JsonObject', () => {
  it('is its own object view', () => {
    const object = new JsonObject();
    expect(object.getAsJsonObject()).toBe(object);
    expect(object.isJsonObject()).toBe(true);
  });

  it('has no number, naming its class as the vectors record', () => {
    expect(() => new JsonObject().getAsNumber()).toThrow(new UnsupportedOperationException('JsonObject'));
  });

  it('adds Integer and Double numbers', () => {
    const object = new JsonObject();
    object.addPropertyInt('i', 3);
    object.addPropertyDouble('d', 3);
    expect(object.toString()).toBe('{"i":3,"d":3.0}');
  });

  it('hands out a snapshot of its entries', () => {
    const object = objectOf({ a: true });
    const entries = object.entrySet();
    object.addProperty('b', false);
    expect(entries.map(([name]) => name)).toEqual(['a']);
  });

  it('compares members ignoring order', () => {
    const a = objectOf({ x: true, y: false });
    expect(a.equals(a)).toBe(true);
    expect(a.equals(objectOf({ y: false, x: true }))).toBe(true);
    expect(a.equals(objectOf({ x: true }))).toBe(false);
    expect(a.equals(objectOf({ x: true, z: false }))).toBe(false);
    expect(a.equals(new JsonArray())).toBe(false);
  });

  it('hashes per the Map.hashCode Javadoc: the sum of key hash xor value hash', () => {
    expect(new JsonObject().hashCode()).toBe(0);
    expect(objectOf({ a: true }).hashCode()).toBe(97 ^ 1231);
    expect(objectOf({ a: true, b: false }).hashCode()).toBe((97 ^ 1231) + (98 ^ 1237));
  });
});
