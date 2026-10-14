// SPDX-License-Identifier: EPL-2.0
// The Gson exception hierarchy: Java `Throwable.toString()` message derivation from a cause (the vectors'
// JsonSyntaxException rows pin it for syntax errors, in JsonParser.test.ts).
import { describe, expect, it } from 'vitest';
import { JsonIOException } from './JsonIOException.js';
import { JsonParseException, throwableToString } from './JsonParseException.js';
import { JsonSyntaxException } from './JsonSyntaxException.js';
import { IOException } from '../java/io/IOException.js';

describe('Gson exceptions', () => {
  it('keeps an explicit message and cause', () => {
    const cause = new Error('inner');
    const error = new JsonParseException('outer', cause);
    expect(error.message).toBe('outer');
    expect(error.cause).toBe(cause);
    expect(error.name).toBe('JsonParseException');
  });

  it('takes a message without a cause', () => {
    expect(new JsonParseException('only').cause).toBeUndefined();
  });

  it('derives the message from a cause like Throwable(Throwable)', () => {
    const cause = new IOException('disk gone');
    const error = new JsonIOException(cause);
    expect(error.message).toBe('java.io.IOException: disk gone');
    expect(error.cause).toBe(cause);
    expect(error.name).toBe('JsonIOException');
    expect(error).toBeInstanceOf(JsonParseException);
  });

  it('names a plain Error by its name', () => {
    expect(throwableToString(new TypeError('bad'))).toBe('TypeError: bad');
    expect(new JsonSyntaxException(new TypeError('bad')).message).toBe('TypeError: bad');
  });
});
