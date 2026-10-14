// SPDX-License-Identifier: EPL-2.0
// The `write` rows of gson.json are driven through Streams.write in stream/JsonWriter.test.ts.
import { describe, expect, it } from 'vitest';
import { JsonArray } from '../JsonArray.js';
import { JsonNull } from '../JsonNull.js';
import { JsonObject } from '../JsonObject.js';
import { JsonPrimitive } from '../JsonPrimitive.js';
import { JsonWriter } from '../stream/JsonWriter.js';
import { Streams } from './Streams.js';

describe('Streams.write', () => {
  it('writes every element kind in order, keeping null members by default', () => {
    const array = new JsonArray();
    array.add(JsonPrimitive.ofInt(3));
    array.add(null);
    const object = new JsonObject();
    object.add('s', new JsonPrimitive('x'));
    object.add('b', new JsonPrimitive(true));
    object.add('n', JsonNull.INSTANCE);
    object.add('a', array);
    const writer = new JsonWriter();
    Streams.write(object, writer);
    expect(writer.toString()).toBe('{"s":"x","b":true,"n":null,"a":[3,null]}');
  });
});
