// SPDX-License-Identifier: EPL-2.0
import { simpleNameOf } from '../java/lang/JavaClass.js';
import { IllegalStateException } from '../java/lang/IllegalStateException.js';
import { UnsupportedOperationException } from '../java/lang/UnsupportedOperationException.js';
import type { JavaNumber } from './LazilyParsedNumber.js';
import type { JsonArray } from './JsonArray.js';
import type { JsonObject } from './JsonObject.js';
import type { JsonPrimitive } from './JsonPrimitive.js';

/**
 * A Gson tree node. The `getAs...` conversions throw `UnsupportedOperationException` (message: the
 * simple class name) unless a subclass overrides them; `getAsJsonObject`/`getAsJsonArray`/
 * `getAsJsonPrimitive` throw `IllegalStateException` on a node of another kind. `equals`/`hashCode`/
 * `toString` follow the Java contract (`toString` is the compact JSON text, nulls included).
 *
 * @see https://www.javadoc.io/doc/com.google.code.gson/gson/2.11.0/com.google.gson/com/google/gson/JsonElement.html
 */
export abstract class JsonElement {
  abstract equals(other: unknown): boolean;

  abstract hashCode(): number;

  abstract toString(): string;

  isJsonArray(): boolean {
    return false;
  }

  isJsonObject(): boolean {
    return false;
  }

  isJsonPrimitive(): boolean {
    return false;
  }

  isJsonNull(): boolean {
    return false;
  }

  getAsJsonObject(): JsonObject {
    throw new IllegalStateException(`Not a JSON Object: ${this.toString()}`);
  }

  getAsJsonArray(): JsonArray {
    throw new IllegalStateException(`Not a JSON Array: ${this.toString()}`);
  }

  getAsJsonPrimitive(): JsonPrimitive {
    throw new IllegalStateException(`Not a JSON Primitive: ${this.toString()}`);
  }

  getAsNumber(): JavaNumber {
    throw this.unsupported();
  }

  getAsString(): string {
    throw this.unsupported();
  }

  getAsDouble(): number {
    throw this.unsupported();
  }

  getAsBoolean(): boolean {
    throw this.unsupported();
  }

  private unsupported(): UnsupportedOperationException {
    return new UnsupportedOperationException(simpleNameOf(this.constructor));
  }
}
