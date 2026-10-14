// SPDX-License-Identifier: EPL-2.0

/**
 * The tokens `JsonReader.peek()` reports (an as-const object, not an enum: the value is the Java constant name).
 *
 * @see https://www.javadoc.io/doc/com.google.code.gson/gson/2.11.0/com.google.gson/com/google/gson/stream/JsonToken.html
 */
export const JsonToken = {
  BEGIN_ARRAY: 'BEGIN_ARRAY',
  END_ARRAY: 'END_ARRAY',
  BEGIN_OBJECT: 'BEGIN_OBJECT',
  END_OBJECT: 'END_OBJECT',
  NAME: 'NAME',
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  NULL: 'NULL',
  END_DOCUMENT: 'END_DOCUMENT',
} as const;

export type JsonToken = (typeof JsonToken)[keyof typeof JsonToken];
