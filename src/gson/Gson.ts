// SPDX-License-Identifier: EPL-2.0
import { readElement } from './internal/JsonElementReader.js';
import { Streams } from './internal/Streams.js';
import { JsonElement } from './JsonElement.js';
import type { JsonReader } from './stream/JsonReader.js';
import { JsonWriter } from './stream/JsonWriter.js';
import { TypeAdapter } from './TypeAdapter.js';

const PRETTY_INDENT = '  ';

class JsonElementAdapter extends TypeAdapter<JsonElement> {
  override read(reader: JsonReader): JsonElement {
    return readElement(reader);
  }

  override write(writer: JsonWriter, value: JsonElement): void {
    Streams.write(value, writer);
  }
}

const JSON_ELEMENT_ADAPTER: TypeAdapter<JsonElement> = new JsonElementAdapter();

/**
 * The part of Gson 2.11.0 graph.json uses (J1): the `JsonElement` adapter and `toJson(JsonElement)`.
 * `toJson` writes with `serializeNulls` false (the Gson default: a null object member is dropped) and a
 * two-space indent when built pretty. Like Gson, it escapes `<`, `>`, `&`, `=` and `'` (values and names)
 * unless built with `disableHtmlEscaping`.
 *
 * @see https://www.javadoc.io/doc/com.google.code.gson/gson/2.11.0/com.google.gson/com/google/gson/Gson.html
 */
export class Gson {
  constructor(
    private readonly pretty: boolean = false,
    private readonly htmlSafe: boolean = true,
  ) {}

  /** Java `getAdapter(Class)`: only `JsonElement` has a caller. */
  getAdapter(_type: typeof JsonElement): TypeAdapter<JsonElement> {
    return JSON_ELEMENT_ADAPTER;
  }

  /** Java `toJson(JsonElement)`. */
  toJson(element: JsonElement): string {
    const writer = new JsonWriter();
    writer.setSerializeNulls(false);
    writer.setHtmlSafe(this.htmlSafe);
    if (this.pretty) writer.setIndent(PRETTY_INDENT);
    Streams.write(element, writer);
    return writer.toString();
  }
}
