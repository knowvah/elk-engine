// SPDX-License-Identifier: EPL-2.0
import { JsonToken } from '../stream/JsonToken.js';

/** What the reader has already looked at but not consumed (Gson's `PEEKED_*` states). */
export const Peeked = {
  NONE: 0,
  BEGIN_OBJECT: 1,
  END_OBJECT: 2,
  BEGIN_ARRAY: 3,
  END_ARRAY: 4,
  TRUE: 5,
  FALSE: 6,
  NULL: 7,
  SINGLE_QUOTED: 8,
  DOUBLE_QUOTED: 9,
  UNQUOTED: 10,
  SINGLE_QUOTED_NAME: 11,
  DOUBLE_QUOTED_NAME: 12,
  UNQUOTED_NAME: 13,
  NUMBER: 14,
  EOF: 15,
} as const;

/** The scope on top of the reader's stack. */
export const Scope = {
  EMPTY_ARRAY: 1,
  NONEMPTY_ARRAY: 2,
  EMPTY_OBJECT: 3,
  DANGLING_NAME: 4,
  NONEMPTY_OBJECT: 5,
  EMPTY_DOCUMENT: 6,
  NONEMPTY_DOCUMENT: 7,
} as const;

export const TOKEN_OF_PEEKED: Readonly<Record<number, JsonToken>> = {
  [Peeked.BEGIN_OBJECT]: JsonToken.BEGIN_OBJECT,
  [Peeked.END_OBJECT]: JsonToken.END_OBJECT,
  [Peeked.BEGIN_ARRAY]: JsonToken.BEGIN_ARRAY,
  [Peeked.END_ARRAY]: JsonToken.END_ARRAY,
  [Peeked.TRUE]: JsonToken.BOOLEAN,
  [Peeked.FALSE]: JsonToken.BOOLEAN,
  [Peeked.NULL]: JsonToken.NULL,
  [Peeked.SINGLE_QUOTED]: JsonToken.STRING,
  [Peeked.DOUBLE_QUOTED]: JsonToken.STRING,
  [Peeked.UNQUOTED]: JsonToken.STRING,
  [Peeked.SINGLE_QUOTED_NAME]: JsonToken.NAME,
  [Peeked.DOUBLE_QUOTED_NAME]: JsonToken.NAME,
  [Peeked.UNQUOTED_NAME]: JsonToken.NAME,
  [Peeked.NUMBER]: JsonToken.NUMBER,
  [Peeked.EOF]: JsonToken.END_DOCUMENT,
};

export const SIMPLE_ESCAPES: Readonly<Record<string, string>> = { t: '\t', b: '\b', n: '\n', r: '\r', f: '\f' };
export const KEYWORDS: Readonly<Record<string, readonly [string, number]>> = {
  t: ['true', Peeked.TRUE],
  f: ['false', Peeked.FALSE],
  n: ['null', Peeked.NULL],
};

/** A JSON number (RFC 8259 grammar) at the scan position. */
export const NUMBER_PATTERN = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
export const HEX_ESCAPE_PATTERN = /^[0-9a-fA-F]{4}$/;

/** The JSONPath (`$.a[2]`) of a reader whose scope stack, object member names and array indices are given. */
export function buildPath(
  stack: readonly number[],
  stackSize: number,
  pathNames: readonly (string | null)[],
  pathIndices: readonly number[],
): string {
  const parts: string[] = ['$'];
  for (let i = 0; i < stackSize; i++) {
    const scope = stack[i];
    if (scope === Scope.EMPTY_ARRAY || scope === Scope.NONEMPTY_ARRAY) {
      parts.push(`[${pathIndices[i]}]`);
    } else if (scope === Scope.EMPTY_OBJECT || scope === Scope.DANGLING_NAME || scope === Scope.NONEMPTY_OBJECT) {
      parts.push('.', pathNames[i] ?? '');
    }
  }
  return parts.join('');
}
