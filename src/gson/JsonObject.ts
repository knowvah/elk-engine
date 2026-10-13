// SPDX-License-Identifier: EPL-2.0
import { hashCode as stringHashCode } from '../java/lang/JavaString.js';
import { add } from '../java/lang/Int32.js';
import { JsonElement } from './JsonElement.js';
import { JsonNull } from './JsonNull.js';
import { JsonPrimitive, quoteJsonString } from './JsonPrimitive.js';

/**
 * An insertion-ordered map of names to {@link JsonElement}s: re-adding a name keeps its position,
 * `remove` then `add` moves it to the end. Java's `addProperty(String, String|Boolean|Number)` is
 * `addProperty` for a string or boolean (the run-time type tells them apart, translation-rules 6.5) and
 * `addPropertyInt`/`addPropertyDouble` for a `Number` (TS cannot tell `int` from `double`); a `null`
 * string or boolean value stores {@link JsonNull}.
 *
 * @see https://www.javadoc.io/doc/com.google.code.gson/gson/2.11.0/com.google.gson/com/google/gson/JsonObject.html
 */
export class JsonObject extends JsonElement {
  private readonly members = new Map<string, JsonElement>();

  override isJsonObject(): boolean {
    return true;
  }

  override getAsJsonObject(): JsonObject {
    return this;
  }

  /**
   * Java `add(String, JsonElement)`: adds or replaces a member; a `null` value becomes {@link JsonNull}.
   *
   * @throws TypeError for a `null` property (Java: `NullPointerException` "key == null", D10)
   */
  add(property: string, value: JsonElement | null): void {
    if ((property as unknown) === null) throw new TypeError('key == null');
    this.members.set(property, value ?? JsonNull.INSTANCE);
  }

  /** Java `addProperty(String, String)` and `addProperty(String, Boolean)`. */
  addProperty(property: string, value: string | boolean | null): void {
    this.add(property, value === null ? null : new JsonPrimitive(value));
  }

  /** Java `addProperty(String, Number)` for an `Integer`. */
  addPropertyInt(property: string, value: number): void {
    this.add(property, JsonPrimitive.ofInt(value));
  }

  /** Java `addProperty(String, Number)` for a `Double`. */
  addPropertyDouble(property: string, value: number): void {
    this.add(property, JsonPrimitive.ofDouble(value));
  }

  /** Removes a member, returning it, or `null` when absent. */
  remove(property: string): JsonElement | null {
    const previous = this.members.get(property) ?? null;
    this.members.delete(property);
    return previous;
  }

  has(memberName: string): boolean {
    return this.members.has(memberName);
  }

  get(memberName: string): JsonElement | null {
    return this.members.get(memberName) ?? null;
  }

  /** A snapshot of the members in insertion order. */
  entrySet(): readonly (readonly [string, JsonElement])[] {
    return [...this.members];
  }

  size(): number {
    return this.members.size;
  }

  /** Order-insensitive, as `Map.equals`. */
  equals(other: unknown): boolean {
    if (this === other) return true;
    if (!(other instanceof JsonObject) || other.size() !== this.size()) return false;
    for (const [name, value] of this.members) {
      if (!(other.get(name)?.equals(value) ?? false)) return false;
    }
    return true;
  }

  /** `Map.hashCode()`: the int32 sum of `keyHash ^ valueHash` over the members. */
  hashCode(): number {
    let sum = 0;
    for (const [name, value] of this.members) sum = add(sum, stringHashCode(name) ^ value.hashCode());
    return sum;
  }

  override toString(): string {
    const members = [...this.members].map(([name, value]) => `${quoteJsonString(name)}:${value.toString()}`);
    return `{${members.join(',')}}`;
  }
}
