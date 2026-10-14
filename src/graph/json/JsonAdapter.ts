// SPDX-License-Identifier: EPL-2.0
import { ClassCastException } from '../../java/lang/ClassCastException.js';
import { d2i } from '../../java/lang/JavaMath.js';
import { JsonArray } from '../../gson/JsonArray.js';
import { JsonElement } from '../../gson/JsonElement.js';
import { JsonObject } from '../../gson/JsonObject.js';
import { JsonPrimitive } from '../../gson/JsonPrimitive.js';
import { JsonImportException } from './JsonImportException.js';

const ID_KEY = 'id';
const NO_ID_MESSAGE = 'Every element must have an id.';
const IMPLEMENTATION_ERROR_MESSAGE = 'Severe implementation error in the Json to ElkGraph importer.';

/**
 * A non-null receiver; Java dereferences a null one: a `NullPointerException` (D10: `TypeError`). The one instance for
 * every importer/exporter site; {@link unbox} is the same check for a `Double` that Java auto-unboxes.
 */
export function deref<T>(o: T | undefined | null): T {
  if (o === undefined || o === null) throw new TypeError();
  return o;
}

/** Java auto-unboxing of a `Double` that is null: a `NullPointerException` (D10). */
export function unbox(d: number | undefined | null): number {
  return deref(d);
}

/**
 * The library dependent part of the JsonImporter using the (ported) Gson model. Whenever methods
 * are added or removed, elkjs's corresponding JsonAdapter must be updated accordingly (J9).
 *
 * Overloads (translation-rules 6.5): the Xtend `Number` overloads are `...Int` (Java `Integer`) and
 * `...Double` (Java `Double`), because a JS number does not say which. The Xtend `Object` overloads
 * are `addJsonObjObject` / `addJsonArrObject`, which take a JS number as an `Integer`. The `String`, `boolean`
 * and `JsonElement` overloads of `addJsonObj` share the name, distinguished by `typeof`/`instanceof`.
 *
 * @see org.eclipse.elk.graph.json/src/org/eclipse/elk/graph/json/JsonAdapter.xtend
 */
export class JsonAdapter {
  // Getting the id of an element

  getId(o: JsonObject): string | number {
    if (!o.has(ID_KEY)) {
      throw this.formatError(NO_ID_MESSAGE);
    }
    return this.asId(o.get(ID_KEY) as JsonElement); // present, so non-null
  }

  asId(id: JsonElement): string | number {
    if (id instanceof JsonPrimitive) {
      if (id.isString()) return id.getAsString();
      if (id.isNumber() && this.isInt(id.getAsDouble())) return d2i(id.getAsDouble());
    }
    throw this.formatError(`Id must be a string or an integer: '${id.toString()}'.`);
  }

  getIdSave(o: JsonObject): string | null {
    return this.optString(o, ID_KEY);
  }

  // Errors

  implementationError(): Error {
    return new Error(IMPLEMENTATION_ERROR_MESSAGE);
  }

  /** Returns, does not throw: the caller throws (the exporter does not, J5). */
  formatError(msg: string): JsonImportException {
    return new JsonImportException(msg);
  }

  // Type emulation

  /** Java `o as JsonObject`: null passes through (Java fails at the first dereference), a wrong type is a cast failure. */
  toJsonObject(o: unknown): JsonObject | null {
    if (o === null || o === undefined) return null;
    if (!(o instanceof JsonObject)) throw new ClassCastException();
    return o;
  }

  /** As {@link toJsonObject}, for arrays. */
  toJsonArray(o: unknown): JsonArray | null {
    if (o === null || o === undefined) return null;
    if (!(o instanceof JsonArray)) throw new ClassCastException();
    return o;
  }

  // Getting values of the json elements

  /** A primitive (string, number, boolean) is converted to a String by `getAsString`. */
  stringVal(e: JsonElement): string {
    return e.getAsString();
  }

  /** The `(JsonObject|Object, String)` and `(JsonArray, int)` overloads, told apart by the key type. */
  optString(arr: JsonArray | null, i: number): string | null;
  optString(o: unknown, element: string): string | null;
  optString(o: unknown, key: string | number): string | null {
    if (typeof key === 'number') {
      return deref(this.toJsonArray(o)).get(key).getAsString();
    }
    if (o === null || o === undefined) return null;
    return this.toJsonObject(o)?.get(key)?.getAsString() ?? null;
  }

  optDouble(o: JsonObject, element: string): number | null {
    return o.has(element) ? (o.get(element) as JsonElement).getAsDouble() : null;
  }

  optJSONArray(o: JsonObject, element: string): JsonArray | null {
    return o.get(element)?.getAsJsonArray() ?? null;
  }

  optJSONObject(o: JsonObject, element: string): JsonObject | null;
  optJSONObject(arr: JsonArray, i: number): JsonObject | null;
  optJSONObject(o: JsonObject | JsonArray, key: string | number): JsonObject | null {
    if (typeof key === 'number') {
      return (o as JsonArray).get(key).getAsJsonObject();
    }
    return (o as JsonObject).get(key)?.getAsJsonObject() ?? null;
  }

  sizeJsonArr(o: JsonArray): number {
    return o.size();
  }

  hasJsonObj(o: JsonObject, element: string): boolean {
    return o.has(element);
  }

  keysJsonObj(o: JsonObject): Iterable<string> {
    return o.entrySet().map(([name]) => name);
  }

  getJsonObj(o: JsonObject, element: string): JsonElement | null {
    return o.get(element);
  }

  getJsonArr(arr: JsonArray, i: number): JsonElement {
    return arr.get(i);
  }

  // Create new json elements

  newJsonObject(): JsonObject {
    return new JsonObject();
  }

  newJsonArray(): JsonArray {
    return new JsonArray();
  }

  toJson(s: string): JsonPrimitive {
    return new JsonPrimitive(s);
  }

  /** Java `toJson(Number)` for an `Integer`. */
  toJsonInt(n: number): JsonPrimitive {
    return JsonPrimitive.ofInt(n);
  }

  /** Java `toJson(Number)` for a `Double`. */
  toJsonDouble(n: number): JsonPrimitive {
    return JsonPrimitive.ofDouble(n);
  }

  // Add members to a json object

  /** Java `addJsonObj(Number)` for an `Integer`. */
  addJsonObjInt(o: JsonObject, element: string, n: number): void {
    o.addPropertyInt(element, n);
  }

  /** Java `addJsonObj(Number)` for a `Double`. */
  addJsonObjDouble(o: JsonObject, element: string, n: number): void {
    o.addPropertyDouble(element, n);
  }

  /**
   * The `boolean`, `String` and `JsonElement` overloads; a `null` is a `String`/`JsonElement` null,
   * stored as JSON null.
   *
   * @see JsonAdapter.xtend `addJsonObj(JsonObject, String, boolean|String|JsonElement)`
   */
  addJsonObj(o: JsonObject, element: string, value: string | boolean | JsonElement | null): void {
    if (value instanceof JsonElement) {
      o.add(element, value);
    } else {
      o.addProperty(element, value);
    }
  }

  /**
   * The Xtend `switch` of `addJsonObj(JsonObject, String, Object)`: a string or boolean goes to its
   * overload, a number is an `Integer` (the only such call sites pass ids from `asId`,
   * JsonAdapter.xtend:46); anything else, null included, is `implementationError`.
   *
   * @see JsonAdapter.xtend `addJsonObj(JsonObject, String, Object)`
   */
  addJsonObjObject(o: JsonObject, element: string, obj: unknown): void {
    if (typeof obj === 'string' || typeof obj === 'boolean') {
      this.addJsonObj(o, element, obj);
    } else if (typeof obj === 'number') {
      this.addJsonObjInt(o, element, obj);
    } else {
      throw this.implementationError();
    }
  }

  // Remove members from a json object

  removeJsonObj(o: JsonObject, element: string): void {
    o.remove(element);
  }

  // Add to a json array

  /** @see JsonAdapter.xtend `addJsonArr(JsonArray, JsonElement)`; a null is added as JSON null. */
  addJsonArr(arr: JsonArray, je: JsonElement | null): void {
    arr.add(je);
  }

  /**
   * The Xtend `switch` of `addJsonArr(JsonArray, Object)`: a string is wrapped, a number is an
   * `Integer` (ids from `asId`, JsonAdapter.xtend:46); anything else, null included, is
   * `implementationError`.
   *
   * @see JsonAdapter.xtend `addJsonArr(JsonArray, Object)`
   */
  addJsonArrObject(arr: JsonArray, o: unknown): void {
    if (typeof o === 'string') {
      this.addJsonArr(arr, this.toJson(o));
    } else if (typeof o === 'number') {
      this.addJsonArr(arr, this.toJsonInt(o));
    } else {
      throw this.implementationError();
    }
  }

  // Convenience

  isInt(d: number): boolean {
    return d % 1 === 0;
  }
}
