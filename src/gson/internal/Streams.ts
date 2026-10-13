// SPDX-License-Identifier: EPL-2.0
import { JsonArray } from '../JsonArray.js';
import type { JsonElement } from '../JsonElement.js';
import { JsonObject } from '../JsonObject.js';
import type { JsonWriter } from '../stream/JsonWriter.js';

/** The part of `com.google.gson.internal.Streams` that `Gson.toJson(JsonElement)` uses. */
export const Streams = {
  /**
   * Writes `element` to `writer`. A `JsonNull` object member is passed to `nullValue` like any
   * other, so the writer's `serializeNulls` setting decides whether it is dropped (Gson 2.11.0).
   */
  write(element: JsonElement, writer: JsonWriter): void {
    if (element.isJsonNull()) {
      writer.nullValue();
    } else if (element instanceof JsonObject) {
      writer.beginObject();
      for (const [name, member] of element.entrySet()) {
        writer.name(name);
        Streams.write(member, writer);
      }
      writer.endObject();
    } else if (element instanceof JsonArray) {
      writer.beginArray();
      for (const item of element) Streams.write(item, writer);
      writer.endArray();
    } else {
      writePrimitive(element, writer);
    }
  },
};

function writePrimitive(element: JsonElement, writer: JsonWriter): void {
  const primitive = element.getAsJsonPrimitive();
  if (primitive.isNumber()) writer.numberValue(primitive.getAsNumber().toString());
  else if (primitive.isBoolean()) writer.booleanValue(primitive.getAsBoolean());
  else writer.value(primitive.getAsString());
}
