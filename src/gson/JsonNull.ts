// SPDX-License-Identifier: EPL-2.0
import { hashCode as stringHashCode } from '../java/lang/JavaString.js';
import { JsonElement } from './JsonElement.js';

const NULL_TEXT = 'null';
// Java uses JsonNull.class.hashCode() (an identity hash); only its constancy is observable.
const NULL_HASH_CODE: number = stringHashCode('JsonNull');

/**
 * The JSON `null`; the single instance is {@link JsonNull.INSTANCE}.
 *
 * @see https://www.javadoc.io/doc/com.google.code.gson/gson/2.11.0/com.google.gson/com/google/gson/JsonNull.html
 */
export class JsonNull extends JsonElement {
  static readonly INSTANCE: JsonNull = new JsonNull();

  private constructor() {
    super();
  }

  override isJsonNull(): boolean {
    return true;
  }

  equals(other: unknown): boolean {
    return other instanceof JsonNull;
  }

  hashCode(): number {
    return NULL_HASH_CODE;
  }

  override toString(): string {
    return NULL_TEXT;
  }
}
