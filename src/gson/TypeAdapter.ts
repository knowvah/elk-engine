// SPDX-License-Identifier: EPL-2.0
import type { JsonReader } from './stream/JsonReader.js';
import type { JsonWriter } from './stream/JsonWriter.js';

/**
 * Converts between a Java value and its JSON stream form. Only `read` and `write` are ported.
 *
 * @see https://www.javadoc.io/doc/com.google.code.gson/gson/2.11.0/com.google.gson/com/google/gson/TypeAdapter.html
 */
export abstract class TypeAdapter<T> {
  /** Java `read(JsonReader)`: reads the next JSON value from `reader`. */
  abstract read(reader: JsonReader): T;

  /** Java `write(JsonWriter, T)`: writes `value` to `writer`. */
  abstract write(writer: JsonWriter, value: T): void;
}
