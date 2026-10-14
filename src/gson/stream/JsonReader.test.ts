// SPDX-License-Identifier: EPL-2.0
// Reader contract beyond the gson.json `parse` rows (driven in ../JsonParser.test.ts): the token API, paths,
// skipValue, and error paths the rows do not reach. Messages without a vector row are matched by prefix only.
import { describe, expect, it } from 'vitest';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { JsonReader } from './JsonReader.js';
import { JsonToken } from './JsonToken.js';
import { EOFException } from '../../java/io/EOFException.js';
import { MalformedJsonException } from './MalformedJsonException.js';

function lenient(text: string): JsonReader {
  const reader = new JsonReader(text);
  reader.setLenient(true);
  return reader;
}

function thrownMessage(action: () => unknown): string {
  try {
    action();
  } catch (e) {
    return (e as Error).message;
  }
  return 'did not throw';
}

function startsWith(prefix: string): RegExp {
  return new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
}

/** Every token `peek()` reports while the reader walks the whole text, consuming scalars as strings. */
function walk(reader: JsonReader): JsonToken[] {
  const tokens: JsonToken[] = [];
  for (let token = reader.peek(); token !== JsonToken.END_DOCUMENT; token = reader.peek()) {
    tokens.push(token);
    if (token === JsonToken.BEGIN_ARRAY) reader.beginArray();
    else if (token === JsonToken.END_ARRAY) reader.endArray();
    else if (token === JsonToken.BEGIN_OBJECT) reader.beginObject();
    else if (token === JsonToken.END_OBJECT) reader.endObject();
    else if (token === JsonToken.NAME) reader.nextName();
    else if (token === JsonToken.BOOLEAN) reader.nextBoolean();
    else if (token === JsonToken.NULL) reader.nextNull();
    else reader.nextString();
  }
  return tokens;
}

describe('JsonReader tokens and paths', () => {
  it('reports each token kind in order', () => {
    expect(walk(new JsonReader('{"a":[1,true,null,"s"],"b":{}}'))).toEqual([
      JsonToken.BEGIN_OBJECT,
      JsonToken.NAME,
      JsonToken.BEGIN_ARRAY,
      JsonToken.NUMBER,
      JsonToken.BOOLEAN,
      JsonToken.NULL,
      JsonToken.STRING,
      JsonToken.END_ARRAY,
      JsonToken.NAME,
      JsonToken.BEGIN_OBJECT,
      JsonToken.END_OBJECT,
      JsonToken.END_OBJECT,
    ]);
  });

  it('tracks the path through objects and arrays', () => {
    const reader = new JsonReader('{"a":[1,{"k":2}]}');
    const paths = [reader.getPath()];
    reader.beginObject();
    paths.push(reader.getPath());
    reader.nextName();
    paths.push(reader.getPath());
    reader.beginArray();
    paths.push(reader.getPath());
    reader.nextString();
    paths.push(reader.getPath());
    reader.beginObject();
    reader.nextName();
    paths.push(reader.getPath());
    expect(paths).toEqual(['$', '$.', '$.a', '$.a[0]', '$.a[1]', '$.a[1].k']);
  });

  it('keeps number text verbatim and reads booleans', () => {
    const reader = new JsonReader('[1.50e+2,false]');
    reader.beginArray();
    expect(reader.nextString()).toBe('1.50e+2');
    expect(reader.nextBoolean()).toBe(false);
    expect(reader.hasNext()).toBe(false);
    reader.endArray();
    expect(reader.hasNext()).toBe(false);
  });

  it('reads quoted, single-quoted and unquoted names leniently', () => {
    const reader = lenient(`{"a":1,'b':2,c:3}`);
    reader.beginObject();
    const names: string[] = [];
    while (reader.hasNext()) {
      names.push(reader.nextName());
      reader.nextString();
    }
    expect(names).toEqual(['a', 'b', 'c']);
  });

  it('accepts keywords in any case and skips a byte order mark', () => {
    const reader = lenient('﻿[NULL,False]');
    reader.beginArray();
    reader.nextNull();
    expect(reader.nextBoolean()).toBe(false);
  });

  it('reads a literal that merely starts like a keyword as a string', () => {
    const reader = lenient('[trueish,nul]');
    reader.beginArray();
    expect(reader.nextString()).toBe('trueish');
    expect(reader.nextString()).toBe('nul');
  });

  it('reads a lenient separator in place of an element as null', () => {
    expect(walk(lenient('[;1]'))).toEqual([
      JsonToken.BEGIN_ARRAY,
      JsonToken.NULL,
      JsonToken.NUMBER,
      JsonToken.END_ARRAY,
    ]);
  });

  it('reports the strictness it was given', () => {
    const reader = new JsonReader('1');
    expect(reader.isLenient()).toBe(false);
    reader.setLenient(true);
    expect(reader.isLenient()).toBe(true);
  });
});

describe('JsonReader skipValue', () => {
  it('skips scalars, names and whole nested values', () => {
    const reader = new JsonReader('{"skip":[1,{"x":[true,null,"s"]}],"keep":7}');
    reader.beginObject();
    reader.skipValue();
    reader.skipValue();
    expect(reader.nextName()).toBe('keep');
    reader.skipValue();
    expect(reader.peek()).toBe(JsonToken.END_OBJECT);
    reader.skipValue();
    expect(reader.peek()).toBe(JsonToken.END_DOCUMENT);
  });

  it('does nothing at the end of the document', () => {
    const reader = new JsonReader('1');
    reader.skipValue();
    reader.skipValue();
    expect(reader.peek()).toBe(JsonToken.END_DOCUMENT);
  });
});

describe('JsonReader misuse', () => {
  it.each([
    ['beginArray', '{}', 'Expected BEGIN_ARRAY but was BEGIN_OBJECT'],
    ['endArray', '[1]', 'Expected END_ARRAY but was BEGIN_ARRAY'],
    ['beginObject', '[]', 'Expected BEGIN_OBJECT but was BEGIN_ARRAY'],
    ['endObject', '{"a":1}', 'Expected END_OBJECT but was BEGIN_OBJECT'],
    ['nextName', '1', 'Expected NAME but was NUMBER'],
    ['nextString', 'true', 'Expected STRING but was BOOLEAN'],
    ['nextBoolean', '"s"', 'Expected BOOLEAN but was STRING'],
    ['nextNull', '1', 'Expected NULL but was NUMBER'],
  ] as const)('%s on %s throws IllegalStateException', (method, text, prefix) => {
    const reader = new JsonReader(text);
    expect(() => reader[method]()).toThrow(IllegalStateException);
    expect(() => reader[method]()).toThrow(new RegExp(`^${prefix} at line 1 column \\d+ path \\$`));
  });
});

describe('JsonReader syntax errors', () => {
  it.each([
    ['[1 2]', 'Unterminated array'],
    ['{"a":1 "b":2}', 'Unterminated object'],
    ['{"a":,}', 'Unexpected value'],
    ['{"a":]', 'Unexpected value'],
    ['[}', 'Expected value'],
    ['{1:2}', 'Use JsonReader.setStrictness(Strictness.LENIENT)'],
  ])('rejects %s', (text, prefix) => {
    expect(() => walk(new JsonReader(text))).toThrow(MalformedJsonException);
    expect(thrownMessage(() => walk(new JsonReader(text)))).toMatch(startsWith(prefix));
  });

  it.each([
    ['{:1}', 'Expected name'],
    ['[/]', 'Expected value'],
    ['/', 'Expected value'],
    ['"abc\\', 'Unterminated escape sequence'],
    ['[}', 'Expected value'],
  ])('rejects %s even when lenient', (text, prefix) => {
    expect(() => walk(lenient(text))).toThrow(MalformedJsonException);
    expect(thrownMessage(() => walk(lenient(text)))).toMatch(startsWith(prefix));
  });

  it('raises EOFException for a missing value', () => {
    expect(() => walk(new JsonReader('{"a":'))).toThrow(EOFException);
    expect(() => walk(new JsonReader('{'))).toThrow(EOFException);
  });

  it('accepts a literal name closed by a lenient separator', () => {
    const reader = lenient('{a=>1;b:2}');
    expect(walk(reader)).toEqual([
      JsonToken.BEGIN_OBJECT,
      JsonToken.NAME,
      JsonToken.NUMBER,
      JsonToken.NAME,
      JsonToken.NUMBER,
      JsonToken.END_OBJECT,
    ]);
  });
});

describe('JsonReader comments and escapes', () => {
  it('skips line comments ended by a newline, a carriage return or the end of input', () => {
    expect(walk(lenient('// a\n[1] // b\r# c\r\n// d'))).toEqual([
      JsonToken.BEGIN_ARRAY,
      JsonToken.NUMBER,
      JsonToken.END_ARRAY,
    ]);
  });

  it('counts lines inside block comments and strings', () => {
    const reader = lenient('/* a\nb */ [ "x\ny", 1 ');
    reader.beginArray();
    reader.nextString();
    reader.nextString();
    expect(() => reader.peek()).toThrow(/^End of input at line 3 column \d+ path \$\[2\]$/);
  });

  it('decodes escapes in single-quoted strings and continuation lines', () => {
    const reader = lenient(`['it\\'s', "a\\\nb", "\\u0041\\/"]`);
    reader.beginArray();
    expect(reader.nextString()).toBe("it's");
    expect(reader.nextString()).toBe('a\nb');
    expect(reader.nextString()).toBe('A/');
  });
});
