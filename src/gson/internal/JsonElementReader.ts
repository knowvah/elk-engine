// SPDX-License-Identifier: EPL-2.0
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { JsonArray } from '../JsonArray.js';
import type { JsonElement } from '../JsonElement.js';
import { JsonNull } from '../JsonNull.js';
import { JsonObject } from '../JsonObject.js';
import { JsonPrimitive } from '../JsonPrimitive.js';
import { LazilyParsedNumber } from '../LazilyParsedNumber.js';
import type { JsonReader } from '../stream/JsonReader.js';
import { JsonToken } from '../stream/JsonToken.js';

type Container = JsonArray | JsonObject;

// Local bindings: a hot-path read of an imported binding costs a property lookup under the test transform.
const TOKEN = JsonToken;
const ARRAY = JsonArray;
const OBJECT = JsonObject;
const PRIMITIVE = JsonPrimitive;
const LAZY_NUMBER = LazilyParsedNumber;

function tryBeginNesting(reader: JsonReader, peeked: JsonToken): Container | null {
  if (peeked === TOKEN.BEGIN_ARRAY) {
    reader.beginArray();
    return new ARRAY();
  }
  if (peeked === TOKEN.BEGIN_OBJECT) {
    reader.beginObject();
    return new OBJECT();
  }
  return null;
}

function readTerminal(reader: JsonReader, peeked: JsonToken): JsonElement {
  switch (peeked) {
    case TOKEN.STRING:
      return new PRIMITIVE(reader.nextString());
    case TOKEN.NUMBER:
      return new PRIMITIVE(new LAZY_NUMBER(reader.nextString()));
    case TOKEN.BOOLEAN:
      return new PRIMITIVE(reader.nextBoolean());
    case TOKEN.NULL:
      reader.nextNull();
      return JsonNull.INSTANCE;
    default:
      throw new IllegalStateException(`Unexpected token: ${peeked}`);
  }
}

function addMember(container: Container, name: string | null, value: JsonElement): void {
  if (container instanceof ARRAY) container.add(value);
  else container.add(name!, value);
}

/** Reads the members of `current` until it ends; returns a nested container to descend into, if one was met. */
function readMembers(reader: JsonReader, current: Container): Container | null {
  while (reader.hasNext()) {
    const name = current instanceof OBJECT ? reader.nextName() : null;
    const peeked = reader.peek();
    const nested = tryBeginNesting(reader, peeked);
    addMember(current, name, nested ?? readTerminal(reader, peeked));
    if (nested !== null) return nested;
  }
  return null;
}

/**
 * Reads the next value of `reader` into a {@link JsonElement} tree, the behaviour of Gson's
 * `TypeAdapter<JsonElement>.read` (`ElkGraphJson.forGraph` calls it on a lenient reader): number tokens become
 * `JsonPrimitive(LazilyParsedNumber(text))`, a duplicate key keeps its first position, nesting is iterative.
 */
export function readElement(reader: JsonReader): JsonElement {
  const peeked = reader.peek();
  let current = tryBeginNesting(reader, peeked);
  if (current === null) return readTerminal(reader, peeked);
  const ancestors: Container[] = [];
  for (;;) {
    const nested = readMembers(reader, current);
    if (nested !== null) {
      ancestors.push(current);
      current = nested;
      continue;
    }
    if (current instanceof ARRAY) reader.endArray();
    else reader.endObject();
    const parent = ancestors.pop();
    if (parent === undefined) return current;
    current = parent;
  }
}
