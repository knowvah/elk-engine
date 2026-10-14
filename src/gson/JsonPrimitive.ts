// SPDX-License-Identifier: EPL-2.0
import { toString as doubleToString } from '../java/lang/DoubleToString.js';
import { hashCode as doubleHashCode, parseDouble } from '../java/lang/JavaDouble.js';
import { hashCode as stringHashCode } from '../java/lang/JavaString.js';
import { IllegalArgumentException } from '../java/lang/IllegalArgumentException.js';
import { UnsupportedOperationException } from '../java/lang/UnsupportedOperationException.js';
import { JsonElement } from './JsonElement.js';
import { type JavaNumber, LazilyParsedNumber } from './LazilyParsedNumber.js';

const TRUE_HASH_CODE = 1231;
const FALSE_HASH_CODE = 1237;
const LONG_WORD_SHIFT = 32n;
const LONG_BITS = 64;
const INT_BITS = 32;
const LAZY_NUMBER_CLASS = 'com.google.gson.internal.LazilyParsedNumber';
const JSON_NUMBER = new RegExp(String.raw`^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][-+]?[0-9]+)?$`);
const BOOLEAN_TRUE = 'true';
const NOT_NUMBER_OR_STRING = 'Primitive is neither a number nor a string';
const HEX_RADIX = 16;
const UNICODE_ESCAPE_WIDTH = 4;

const ESCAPES: Readonly<Record<string, string>> = {
  '"': '\\"',
  '\\': '\\\\',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
};
// eslint-disable-next-line no-control-regex -- the JSON string grammar escapes control characters
// Zl/Zp are exactly U+2028/U+2029. RegExp constructors, not literals: lizard misreads quotes in literals.
const NEEDS_ESCAPE = new RegExp(String.raw`["\\\u0000-\u001f\p{Zl}\p{Zp}]`, 'gu');

function escapeChar(c: string): string {
  return ESCAPES[c] ?? `\\u${c.charCodeAt(0).toString(HEX_RADIX).padStart(UNICODE_ESCAPE_WIDTH, '0')}`;
}

/**
 * A JSON string literal as `JsonElement.toString()` writes it: `"` `\` and the control characters
 * (plus U+2028/U+2029) escaped, everything else (including `<`, `>`, `&`, `=`, `'`, DEL) verbatim.
 *
 * @param text the unescaped string
 * @returns the quoted literal
 */
export function quoteJsonString(text: string): string {
  return `"${text.replace(NEEDS_ESCAPE, escapeChar)}"`;
}

class IntNumber implements JavaNumber {
  constructor(readonly value: number) {}

  doubleValue(): number {
    return this.value;
  }

  toString(): string {
    return String(this.value);
  }
}

class DoubleNumber implements JavaNumber {
  constructor(private readonly value: number) {}

  doubleValue(): number {
    return this.value;
  }

  toString(): string {
    return doubleToString(this.value);
  }
}

function longHashCode(value: bigint): number {
  const bits = BigInt.asUintN(LONG_BITS, value);
  return Number(BigInt.asIntN(INT_BITS, bits ^ (bits >> LONG_WORD_SHIFT)));
}

/**
 * A JSON string, boolean or number. A number is any {@link JavaNumber}: a parsed literal keeps its
 * text ({@link LazilyParsedNumber}); a Java `Integer`/`Double` is built with {@link ofInt} and
 * {@link ofDouble} (TS cannot tell `int` from `double`, translation-rules 6.5).
 *
 * @see https://www.javadoc.io/doc/com.google.code.gson/gson/2.11.0/com.google.gson/com/google/gson/JsonPrimitive.html
 */
export class JsonPrimitive extends JsonElement {
  private readonly value: string | boolean | JavaNumber;

  /** Java `new JsonPrimitive(String|Boolean|Number)`; a `null` argument is a `NullPointerException` (D10: `TypeError`). */
  constructor(value: string | boolean | JavaNumber) {
    super();
    // Java: Objects.requireNonNull; the types exclude null, a cast caller reaches it.
    if ((value as unknown) === null) throw new TypeError();
    this.value = value;
  }

  /** Java `new JsonPrimitive(Integer)`. */
  static ofInt(value: number): JsonPrimitive {
    return new JsonPrimitive(new IntNumber(value));
  }

  /** Java `new JsonPrimitive(Double)`. */
  static ofDouble(value: number): JsonPrimitive {
    return new JsonPrimitive(new DoubleNumber(value));
  }

  override isJsonPrimitive(): boolean {
    return true;
  }

  override getAsJsonPrimitive(): JsonPrimitive {
    return this;
  }

  isBoolean(): boolean {
    return typeof this.value === 'boolean';
  }

  isNumber(): boolean {
    return typeof this.value === 'object';
  }

  isString(): boolean {
    return typeof this.value === 'string';
  }

  override getAsBoolean(): boolean {
    return typeof this.value === 'boolean' ? this.value : this.getAsString().toLowerCase() === BOOLEAN_TRUE;
  }

  /**
   * The number of a number primitive. Any other kind throws `UnsupportedOperationException`: the
   * message is the recorded one for a boolean; Gson wraps a string in a `LazilyParsedNumber`, which
   * no vector or caller covers.
   */
  override getAsNumber(): JavaNumber {
    if (typeof this.value === 'object') return this.value;
    throw new UnsupportedOperationException(NOT_NUMBER_OR_STRING);
  }

  override getAsString(): string {
    return typeof this.value === 'string' ? this.value : this.value.toString();
  }

  override getAsDouble(): number {
    return typeof this.value === 'object' ? this.value.doubleValue() : parseDouble(this.getAsString());
  }

  equals(other: unknown): boolean {
    if (this === other) return true;
    if (!(other instanceof JsonPrimitive)) return false;
    const [a, b] = [this.value, other.value];
    if (typeof a === 'object' && typeof b === 'object') return numbersEqual(a, b);
    return a === b;
  }

  hashCode(): number {
    if (typeof this.value === 'object') {
      return this.value instanceof IntNumber
        ? longHashCode(BigInt(this.value.value))
        : doubleHashCode(this.value.doubleValue());
    }
    if (typeof this.value === 'boolean') return this.value ? TRUE_HASH_CODE : FALSE_HASH_CODE;
    return stringHashCode(this.value);
  }

  /** @throws IllegalArgumentException for a parsed number whose text is not a JSON number */
  override toString(): string {
    if (typeof this.value === 'string') return quoteJsonString(this.value);
    if (this.value instanceof LazilyParsedNumber && !JSON_NUMBER.test(this.value.toString())) {
      throw new IllegalArgumentException(
        `String created by class ${LAZY_NUMBER_CLASS} is not a valid JSON number: ${this.value.toString()}`,
      );
    }
    return this.getAsString();
  }
}

function numbersEqual(a: JavaNumber, b: JavaNumber): boolean {
  if (a instanceof IntNumber && b instanceof IntNumber) return a.value === b.value;
  const [x, y] = [a.doubleValue(), b.doubleValue()];
  return x === y || (Number.isNaN(x) && Number.isNaN(y));
}
