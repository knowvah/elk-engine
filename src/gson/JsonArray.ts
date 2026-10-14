// SPDX-License-Identifier: EPL-2.0
import { add, mul } from '../java/lang/Int32.js';
import { IllegalStateException } from '../java/lang/IllegalStateException.js';
import { IndexOutOfBoundsException } from '../java/lang/IndexOutOfBoundsException.js';
import { JsonElement } from './JsonElement.js';
import { JsonNull } from './JsonNull.js';
import type { JavaNumber } from './LazilyParsedNumber.js';

const HASH_MULTIPLIER = 31;
const EMPTY_LIST_HASH_CODE = 1;

/**
 * An ordered list of {@link JsonElement}s. Only `add(JsonElement)` is ported: graph.json wraps strings
 * and numbers in a `JsonPrimitive` itself (`JsonAdapter.addJsonArr`). `getAsString`/`getAsDouble`/
 * `getAsBoolean`/`getAsNumber` of a one-element array delegate to the element.
 *
 * @see https://www.javadoc.io/doc/com.google.code.gson/gson/2.11.0/com.google.gson/com/google/gson/JsonArray.html
 */
export class JsonArray extends JsonElement implements Iterable<JsonElement> {
  private readonly elements: JsonElement[] = [];

  override isJsonArray(): boolean {
    return true;
  }

  override getAsJsonArray(): JsonArray {
    return this;
  }

  /** Appends `element`; a `null` becomes {@link JsonNull}. Java `add(JsonElement)`. */
  add(element: JsonElement | null): void {
    this.elements.push(element ?? JsonNull.INSTANCE);
  }

  /** @throws IndexOutOfBoundsException for an index outside `0 until size()` */
  get(index: number): JsonElement {
    if (index < 0 || index >= this.elements.length) {
      throw new IndexOutOfBoundsException(`Index ${index} out of bounds for length ${this.elements.length}`);
    }
    return this.elements[index] as JsonElement; // bounds checked above
  }

  size(): number {
    return this.elements.length;
  }

  [Symbol.iterator](): Iterator<JsonElement> {
    return this.elements[Symbol.iterator]();
  }

  override getAsNumber(): JavaNumber {
    return this.getAsSingleElement().getAsNumber();
  }

  override getAsString(): string {
    return this.getAsSingleElement().getAsString();
  }

  override getAsDouble(): number {
    return this.getAsSingleElement().getAsDouble();
  }

  override getAsBoolean(): boolean {
    return this.getAsSingleElement().getAsBoolean();
  }

  equals(other: unknown): boolean {
    if (this === other) return true;
    if (!(other instanceof JsonArray) || other.size() !== this.size()) return false;
    return this.elements.every((element, i) => element.equals(other.elements[i]));
  }

  /** `List.hashCode()`: `31 * h + element.hashCode()` from 1, in int32 arithmetic. */
  hashCode(): number {
    return this.elements.reduce((h, element) => add(mul(HASH_MULTIPLIER, h), element.hashCode()), EMPTY_LIST_HASH_CODE);
  }

  override toString(): string {
    return `[${this.elements.map((element) => element.toString()).join(',')}]`;
  }

  private getAsSingleElement(): JsonElement {
    if (this.elements.length !== 1) {
      throw new IllegalStateException(`Array must have size 1, but has size ${this.elements.length}`);
    }
    return this.elements[0] as JsonElement; // length is 1
  }
}
