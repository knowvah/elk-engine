// SPDX-License-Identifier: EPL-2.0
// Id messages are the rows of test/golden/refs/java/graph-json.json (err-id-*); the rest follow JsonAdapter.xtend.
import { describe, expect, it } from 'vitest';
import { JsonArray } from '../../gson/JsonArray.js';
import { JsonNull } from '../../gson/JsonNull.js';
import { JsonObject } from '../../gson/JsonObject.js';
import { JsonPrimitive } from '../../gson/JsonPrimitive.js';
import { ClassCastException } from '../../java/lang/ClassCastException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { IndexOutOfBoundsException } from '../../java/lang/IndexOutOfBoundsException.js';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import { JsonAdapter } from './JsonAdapter.js';
import { JsonImportException } from './JsonImportException.js';

const adapter = new JsonAdapter();
const ID_PREFIX = "Id must be a string or an integer: '";

function withId(id: Parameters<JsonObject['add']>[1]): JsonObject {
  const o = new JsonObject();
  o.add('id', id);
  return o;
}

describe('ids', () => {
  it('rejects a missing id', () => {
    const e = captured(() => adapter.getId(new JsonObject()));
    expect(e).toBeInstanceOf(JsonImportException);
    expect(e.message).toBe('Every element must have an id.');
  });

  it('keeps string ids', () => {
    expect(adapter.getId(withId(new JsonPrimitive('foo')))).toBe('foo');
  });

  it('takes integral numbers as int', () => {
    expect(adapter.getId(withId(JsonPrimitive.ofInt(3)))).toBe(3);
    expect(adapter.getId(withId(JsonPrimitive.ofDouble(3)))).toBe(3);
    expect(adapter.asId(JsonPrimitive.ofDouble(2147483648))).toBe(2147483647);
  });

  it.each([
    ['fraction', JsonPrimitive.ofDouble(3.5), '3.5'],
    ['boolean', new JsonPrimitive(true), 'true'],
    ['null', JsonNull.INSTANCE, 'null'],
    ['object', objectOf('a', JsonPrimitive.ofInt(1)), '{"a":1}'],
    ['array', arrayOf(new JsonPrimitive('a')), '["a"]'],
  ])('rejects a %s id', (_name, id, text) => {
    const e = captured(() => adapter.getId(withId(id)));
    expect(e).toBeInstanceOf(JsonImportException);
    expect(e.message).toBe(`${ID_PREFIX}${text}'.`);
  });

  it('getIdSave takes the text of any primitive and null if absent', () => {
    expect(adapter.getIdSave(withId(JsonPrimitive.ofDouble(3)))).toBe('3.0');
    expect(adapter.getIdSave(new JsonObject())).toBeNull();
    expect(() => adapter.getIdSave(withId(new JsonObject()))).toThrow(new UnsupportedOperationException('JsonObject'));
  });
});

describe('errors and casts', () => {
  it('builds the errors', () => {
    expect(adapter.implementationError().message).toBe('Severe implementation error in the Json to ElkGraph importer.');
    expect(adapter.formatError('m')).toBeInstanceOf(JsonImportException);
  });

  it('casts', () => {
    const o = new JsonObject();
    const a = new JsonArray();
    expect(adapter.toJsonObject(o)).toBe(o);
    expect(adapter.toJsonArray(a)).toBe(a);
    expect(() => adapter.toJsonObject(a)).toThrow(ClassCastException);
    expect(() => adapter.toJsonArray(o)).toThrow(ClassCastException);
    expect(adapter.toJsonObject(null)).toBeNull();
    expect(adapter.toJsonArray(undefined)).toBeNull();
  });
});

describe('reading', () => {
  const o = new JsonObject();
  o.addProperty('s', 'x');
  o.addPropertyDouble('d', 1.5);
  o.add('arr', arrayOf(new JsonPrimitive('p')));
  o.add('obj', new JsonObject());
  o.add('nul', null);

  it('stringVal and optString', () => {
    expect(adapter.stringVal(new JsonPrimitive(true))).toBe('true');
    expect(adapter.optString(o, 's')).toBe('x');
    expect(adapter.optString(o, 'missing')).toBeNull();
    expect(adapter.optString(null, 's')).toBeNull();
    expect(adapter.optString(arrayOf(new JsonPrimitive('p')), 0)).toBe('p');
    expect(() => adapter.optString(null, 0)).toThrow(TypeError);
    expect(() => adapter.optString(new JsonArray(), 0)).toThrow(IndexOutOfBoundsException);
    expect(() => adapter.optString(o, 'nul')).toThrow(UnsupportedOperationException);
  });

  it('optDouble', () => {
    expect(adapter.optDouble(o, 'd')).toBe(1.5);
    expect(adapter.optDouble(o, 'missing')).toBeNull();
  });

  it('optJSONArray and optJSONObject', () => {
    expect(adapter.optJSONArray(o, 'arr')?.size()).toBe(1);
    expect(adapter.optJSONArray(o, 'missing')).toBeNull();
    expect(() => adapter.optJSONArray(o, 's')).toThrow(IllegalStateException);
    expect(adapter.optJSONObject(o, 'obj')).toBe(o.get('obj'));
    expect(adapter.optJSONObject(o, 'missing')).toBeNull();
    const arr = arrayOf(new JsonObject());
    expect(adapter.optJSONObject(arr, 0)).toBe(arr.get(0));
    expect(() => adapter.optJSONObject(arr, 1)).toThrow(IndexOutOfBoundsException);
  });

  it('size, has, keys, get', () => {
    expect(adapter.sizeJsonArr(arrayOf(o))).toBe(1);
    expect(adapter.hasJsonObj(o, 's')).toBe(true);
    expect(adapter.hasJsonObj(o, 'zz')).toBe(false);
    expect([...adapter.keysJsonObj(o)]).toEqual(['s', 'd', 'arr', 'obj', 'nul']);
    expect(adapter.getJsonObj(o, 's')?.getAsString()).toBe('x');
    expect(adapter.getJsonObj(o, 'zz')).toBeNull();
    expect(adapter.getJsonArr(arrayOf(o), 0)).toBe(o);
  });

  it('isInt', () => {
    expect([3, -2, 0, 1e300].map((d) => adapter.isInt(d))).toEqual([true, true, true, true]);
    expect([1.5, Number.NaN, Infinity].map((d) => adapter.isInt(d))).toEqual([false, false, false]);
  });
});

describe('writing', () => {
  it('creates elements', () => {
    expect(adapter.newJsonObject().toString()).toBe('{}');
    expect(adapter.newJsonArray().toString()).toBe('[]');
    expect(adapter.toJson('s').toString()).toBe('"s"');
    expect(adapter.toJsonInt(3).toString()).toBe('3');
    expect(adapter.toJsonDouble(3).toString()).toBe('3.0');
  });

  it('adds members by type', () => {
    const o = new JsonObject();
    adapter.addJsonObjInt(o, 'i', 1);
    adapter.addJsonObjDouble(o, 'd', 2);
    adapter.addJsonObj(o, 's', 'x');
    adapter.addJsonObj(o, 'b', false);
    adapter.addJsonObjObject(o, 'n', 7);
    adapter.addJsonObjObject(o, 'os', 'y');
    adapter.addJsonObjObject(o, 'ob', true);
    adapter.addJsonObj(o, 'z', null);
    adapter.addJsonObj(o, 'e', new JsonArray());
    expect(o.toString()).toBe('{"i":1,"d":2.0,"s":"x","b":false,"n":7,"os":"y","ob":true,"z":null,"e":[]}');
    adapter.removeJsonObj(o, 'i');
    expect(o.has('i')).toBe(false);
  });

  it.each([{}, null, undefined, 1n])('rejects %s through the Object overload', (bad) => {
    const error = new Error('Severe implementation error in the Json to ElkGraph importer.');
    expect(() => adapter.addJsonObjObject(new JsonObject(), 'x', bad)).toThrow(error);
    expect(() => adapter.addJsonArrObject(new JsonArray(), bad)).toThrow(error);
  });

  it('adds array entries by type', () => {
    const arr = new JsonArray();
    adapter.addJsonArr(arr, new JsonObject());
    adapter.addJsonArr(arr, null);
    adapter.addJsonArrObject(arr, 's');
    adapter.addJsonArrObject(arr, 4);
    expect(arr.toString()).toBe('[{},null,"s",4]');
    expect(() => adapter.addJsonArrObject(arr, true)).toThrow(
      new Error('Severe implementation error in the Json to ElkGraph importer.'),
    );
  });
});

function captured(f: () => unknown): Error {
  try {
    f();
  } catch (e) {
    return e as Error;
  }
  throw new Error('did not throw');
}

function arrayOf(...elements: Parameters<JsonArray['add']>[0][]): JsonArray {
  const a = new JsonArray();
  for (const e of elements) a.add(e);
  return a;
}

function objectOf(name: string, value: Parameters<JsonObject['add']>[1]): JsonObject {
  const o = new JsonObject();
  o.add(name, value);
  return o;
}
