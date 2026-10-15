// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { StringIndexOutOfBoundsException } from '../../java/lang/StringIndexOutOfBoundsException.js';
import { StringBuilder } from '../../java/lang/StringBuilder.js';

const HEX_DIGITS = '0123456789ABCDEF';
const HEX_MASK = 0xf;
const HEX_DIGIT_BITS = 4;
const UNICODE_HEX_DIGITS = 4;
const FIRST_PRINTABLE = 0x0020;
const LAST_PRINTABLE = 0x007e;
const BACKSLASH = 0x5c;
const LOWER_CASE_BIT = 0x20;
const CODE_0 = 0x30;
const CODE_9 = 0x39;
const CODE_LOWER_A = 0x61;
const CODE_LOWER_F = 0x66;
const CODE_UPPER_A = 0x41;
const DECIMAL_LETTER_OFFSET = 10;

/** Java `case 'b'` ... `case 'r'` of `doUnescapeCharAndAppendTo`: escape letter to the control character. */
const CONTROL_ESCAPES: ReadonlyMap<string, number> = new Map([
  ['b', 0x08],
  ['t', 0x09],
  ['n', 0x0a],
  ['f', 0x0c],
  ['r', 0x0d],
]);
/** Java `case '"': case '\'': case '\\':` - "append as is". */
const AS_IS_ESCAPES: ReadonlySet<string> = new Set(['"', "'", '\\']);
/** Java `escapeAndAppendTo` switch: code unit to its escape sequence. */
const ESCAPE_SEQUENCES: ReadonlyMap<number, string> = new Map([
  [0x08, '\\b'],
  [0x09, '\\t'],
  [0x0a, '\\n'],
  [0x0c, '\\f'],
  [0x0d, '\\r'],
  [0x22, '\\"'],
  [0x27, "\\'"],
  [BACKSLASH, '\\\\'],
]);

/**
 * `String.charAt` as a `char` (UTF-16 code unit): out-of-range access throws Java's
 * `StringIndexOutOfBoundsException` with the JDK 21 message.
 */
function charAt(s: string, index: number): number {
  if (index < 0 || index >= s.length) {
    throw new StringIndexOutOfBoundsException(`Index ${index} out of bounds for length ${s.length}`);
  }
  return s.charCodeAt(index);
}

/**
 * Converts Java string literal escape sequences. `char` is a UTF-16 code unit as `number`; the `char[]`
 * overloads of the Java class collapse to the `string` versions (JavaScript strings are UTF-16).
 * `convertFromJavaString(String, boolean, int, StringBuilder)` is `convertFromJavaStringFrom` (TypeScript
 * cannot override one name at two arities in a subclass).
 *
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/JavaStringConverter.java
 */
export class JavaStringConverter {
  /**
   * Resolve Java control character sequences to the actual character value.
   * Optionally handle unicode escape sequences, too.
   */
  convertFromJavaString(string: string, useUnicode: boolean): string {
    const firstEscapeSequence = string.indexOf('\\');
    if (firstEscapeSequence === -1) {
      return string;
    }
    const result = new StringBuilder();
    this.appendRegion(string, 0, firstEscapeSequence, result);
    return this.convertFromJavaStringFrom(string, useUnicode, firstEscapeSequence, result);
  }

  protected appendRegion(string: string, fromInclusive: number, toExclusive: number, result: StringBuilder): void {
    if (this.validateRegion(string, fromInclusive, toExclusive, result)) {
      result.append(string.substring(fromInclusive, toExclusive));
    } else {
      for (let i = fromInclusive; i < toExclusive; i++) {
        this.validateAndAppendChar(charAt(string, i), result);
      }
    }
  }

  protected validateRegion(
    _string: string,
    _fromInclusive: number,
    _toExclusive: number,
    _result: StringBuilder,
  ): boolean {
    return true;
  }

  protected convertFromJavaStringFrom(
    string: string,
    useUnicode: boolean,
    startIndex: number,
    result: StringBuilder,
  ): string {
    const length = string.length;
    let index = startIndex;
    while (index < length) {
      index = this.unescapeCharAndAppendTo(string, useUnicode, index, result);
      if (index < length) {
        const nextEscapeSequence = string.indexOf('\\', index);
        if (nextEscapeSequence === -1) {
          this.appendRegion(string, index, length, result);
          index = length;
        } else {
          this.appendRegion(string, index, nextEscapeSequence, result);
          index = nextEscapeSequence;
        }
      }
    }
    return result.toString();
  }

  protected unescapeCharAndAppendTo(string: string, useUnicode: boolean, index: number, result: StringBuilder): number {
    const c = charAt(string, index);
    if (c === BACKSLASH) {
      return this.doUnescapeCharAndAppendTo(string, useUnicode, index + 1, result);
    }
    this.validateAndAppendChar(c, result);
    return index + 1;
  }

  protected validateAndAppendChar(c: number, result: StringBuilder): void {
    if (this.validate(c, result)) {
      result.appendChar(c);
    }
  }

  protected validate(_c: number, _result: StringBuilder): boolean {
    return true;
  }

  protected doUnescapeCharAndAppendTo(
    string: string,
    useUnicode: boolean,
    index: number,
    result: StringBuilder,
  ): number {
    let c = charAt(string, index);
    const next = index + 1;
    const letter = String.fromCharCode(c);
    const control = CONTROL_ESCAPES.get(letter);
    if (control !== undefined) {
      c = control;
    } else if (!AS_IS_ESCAPES.has(letter)) {
      // 'u' with unicode handling is the one case left; without it (intentional fall-through) and for
      // every other character the escape is unknown
      return letter === 'u' && useUnicode
        ? this.unescapeUnicodeSequence(string, next, result)
        : this.handleUnknownEscapeSequence(string, c, useUnicode, next, result);
    }
    this.validateAndAppendChar(c, result);
    return next;
  }

  protected handleUnknownEscapeSequence(
    _string: string,
    c: number,
    _useUnicode: boolean,
    _index: number,
    _result: StringBuilder,
  ): number {
    throw new IllegalArgumentException(`Illegal escape character \\${String.fromCharCode(c)}`);
  }

  protected unescapeUnicodeSequence(string: string, index: number, result: StringBuilder): number {
    if (!this.isInvalidUnicodeEscapeSequence(string, index)) {
      const digits = [0, 1, 2, 3].map((offset) => charAt(string, index + offset));
      if (digits.every((digit) => JavaStringConverter.isHex(digit))) {
        let appendMe = 0;
        for (const digit of digits) {
          appendMe = this.buildChar(appendMe, digit);
        }
        this.validateAndAppendChar(appendMe, result);
        return index + UNICODE_HEX_DIGITS;
      }
    }
    return this.handleInvalidUnicodeEscapeSequence(string, index, result);
  }

  private buildChar(appendMe: number, c: number): number {
    if (c <= CODE_9) {
      return (appendMe << HEX_DIGIT_BITS) + c - CODE_0;
    } else if (c >= CODE_LOWER_A) {
      return (appendMe << HEX_DIGIT_BITS) + c - CODE_LOWER_A + DECIMAL_LETTER_OFFSET;
    } else {
      return (appendMe << HEX_DIGIT_BITS) + c - CODE_UPPER_A + DECIMAL_LETTER_OFFSET;
    }
  }

  /**
   * Return true if the chars starting at index do not appear to be a unicode
   * escape sequence (without the leading backslash u).
   */
  protected isInvalidUnicodeEscapeSequence(string: string, index: number): boolean {
    return index + UNICODE_HEX_DIGITS > string.length;
  }

  protected handleInvalidUnicodeEscapeSequence(string: string, index: number, _result: StringBuilder): number {
    throw new IllegalArgumentException(`Illegal \\uxxxx encoding in ${string} at index ${index}`);
  }

  /**
   * Escapes control characters with a preceding backslash.
   * Optionally encodes special chars as unicode escape sequence.
   * The resulting string is safe to be put into a Java string literal between the quotes.
   */
  convertToJavaString(input: string, useUnicode = true): string {
    const result = new StringBuilder();
    for (let i = 0; i < input.length; i++) {
      this.escapeAndAppendTo(input.charCodeAt(i), useUnicode, result);
    }
    return result.toString();
  }

  protected escapeAndAppendTo(c: number, useUnicode: boolean, result: StringBuilder): void {
    const appendMe = ESCAPE_SEQUENCES.get(c);
    if (appendMe !== undefined) {
      result.append(appendMe);
    } else if (useUnicode && this.mustEncodeAsEscapeSequence(c)) {
      result.append('\\u');
      for (let i = 3 * HEX_DIGIT_BITS; i >= 0; i -= HEX_DIGIT_BITS) {
        result.appendChar(this.toHex((c >> i) & HEX_MASK));
      }
    } else {
      result.appendChar(c);
    }
  }

  protected mustEncodeAsEscapeSequence(next: number): boolean {
    return next < FIRST_PRINTABLE || next > LAST_PRINTABLE;
  }

  toHex(i: number): number {
    return HEX_DIGITS.charCodeAt(i & HEX_MASK);
  }

  protected isHexSequence(input: string, off: number, chars: number): boolean {
    return JavaStringConverter.doIsHexSequence(input, off, chars);
  }

  static doIsHexSequence(input: string, off: number, chars: number): boolean {
    for (let i = off; i < input.length && i < off + chars; i++) {
      if (!JavaStringConverter.isHex(input.charCodeAt(i))) {
        return false;
      }
    }
    return true;
  }

  static isHex(char: number): boolean {
    // Java: '0' <= c && (c = (char) (c | 0x20)) <= 'f' && (c <= '9' || 'a' <= c)
    if (CODE_0 > char) return false;
    const folded = char | LOWER_CASE_BIT;
    return folded <= CODE_LOWER_F && (folded <= CODE_9 || CODE_LOWER_A <= folded);
  }
}
