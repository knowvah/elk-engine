// SPDX-License-Identifier: EPL-2.0
import { readElement } from './internal/JsonElementReader.js';
import type { JsonElement } from './JsonElement.js';
import { JsonNull } from './JsonNull.js';
import { JsonSyntaxException } from './JsonSyntaxException.js';
import { JsonReader } from './stream/JsonReader.js';
import { EOFException, IOException } from './stream/MalformedJsonException.js';

/**
 * Parses JSON text into a {@link JsonElement} tree; the text is read leniently (the reader's own strictness is
 * restored afterwards, so a `peek()` on it behaves as before the call).
 *
 * @see https://www.javadoc.io/doc/com.google.code.gson/gson/2.11.0/com.google.gson/com/google/gson/JsonParser.html
 */
export class JsonParser {
  /** Java `JsonParser.parseString(String)` (= `parseReader(Reader)` over a string). */
  static parseString(json: string): JsonElement {
    const reader = new JsonReader(json);
    try {
      const element = JsonParser.parseReader(reader);
      // Gson then throws "Did not consume the entire document." unless peek() is END_DOCUMENT; on this strict
      // reader peek() either is END_DOCUMENT or throws MalformedJsonException, so that throw cannot occur.
      if (!element.isJsonNull()) reader.peek();
      return element;
    } catch (e) {
      throw JsonParser.wrap(e);
    }
  }

  /** Java `JsonParser.parseReader(JsonReader)`: reads the next value; empty input is {@link JsonNull}. */
  static parseReader(reader: JsonReader): JsonElement {
    const lenient = reader.isLenient();
    reader.setLenient(true);
    let isEmpty = true;
    try {
      reader.peek();
      isEmpty = false;
      return readElement(reader);
    } catch (e) {
      if (e instanceof EOFException && isEmpty) return JsonNull.INSTANCE;
      throw JsonParser.wrap(e);
    } finally {
      reader.setLenient(lenient);
    }
  }

  /** A string reader's only `IOException`s are `MalformedJsonException` and `EOFException`: both are syntax errors. */
  private static wrap(error: unknown): unknown {
    return error instanceof IOException ? new JsonSyntaxException(error) : error;
  }
}
