// SPDX-License-Identifier: EPL-2.0
import { STRING } from '../../../java/util/HashStrategy.js';
import { JavaHashSet } from '../../../java/util/JavaHashSet.js';
import type { INode } from '../../nodemodel/INode.js';
import { ValueConverterException } from '../ValueConverterException.js';
import { AbstractLexerBasedConverter, type LexerToken, type TokenSource } from './AbstractLexerBasedConverter.js';

const ESCAPE_PREFIX = '^';
const CODE_UPPER_A = 0x41;
const CODE_UPPER_Z = 0x5a;
const CODE_LOWER_A = 0x61;
const CODE_LOWER_Z = 0x7a;
const CODE_0 = 0x30;
const CODE_9 = 0x39;
const CODE_UNDERSCORE = 0x5f;
const HEX_RADIX = 16;

/** The `ID` terminal: a letter or `_`, then letters, digits and `_` (`collectInvalidCharacters` 96-101). */
function isValidIdCharacter(c: number, position: number): boolean {
  if ((c >= CODE_UPPER_A && c <= CODE_UPPER_Z) || (c >= CODE_LOWER_A && c <= CODE_LOWER_Z)) return true;
  if (position !== 0 && c >= CODE_0 && c <= CODE_9) return true;
  return c === CODE_UNDERSCORE;
}

/**
 * Abstract implementation of a value converter that escapes a string based on a set of values. The
 * `IGrammarAccess` injection becomes {@link AbstractIDValueConverter.computeValuesToEscape} (no grammar).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/conversion/impl/AbstractIDValueConverter.java
 */
export abstract class AbstractIDValueConverter extends AbstractLexerBasedConverter<string> {
  #valuesToEscape: ReadonlySet<string> | null = null;

  protected constructor(tokenSource: TokenSource | null = null) {
    super(tokenSource);
  }

  protected abstract computeValuesToEscape(): ReadonlySet<string>;

  protected getValuesToEscape(): ReadonlySet<string> {
    this.#valuesToEscape ??= this.computeValuesToEscape();
    return this.#valuesToEscape;
  }

  protected abstract mustEscape(value: string): boolean;

  protected override toEscapedString(value: string): string {
    if (this.mustEscape(value)) return ESCAPE_PREFIX + value;
    return value;
  }

  protected override assertValidValue(value: string | null): void {
    super.assertValidValue(value);
    if ((value as string).length === 0) {
      throw new ValueConverterException(`${this.getRuleName()} may not be empty.`, null, null);
    }
  }

  protected override createTokenContentMismatchException(
    value: string,
    escapedString: string,
    token: LexerToken | null,
  ): ValueConverterException {
    const invalidChars = this.collectInvalidCharacters(value);
    if (invalidChars !== null) {
      return new ValueConverterException(this.getInvalidCharactersMessage(value, invalidChars), null, null);
    }
    return super.createTokenContentMismatchException(value, escapedString, token);
  }

  /** The characters are listed in the iteration order of a Java `HashSet<Character>`. */
  protected getInvalidCharactersMessage(value: string, invalidChars: JavaHashSet<string>): string {
    const chars = [...invalidChars].map((from) => `'${from}' (0x${from.charCodeAt(0).toString(HEX_RADIX)})`).join(', ');
    return `ID '${value}' contains invalid characters: ${chars}`;
  }

  /** A `Character` is a one-code-unit string, whose `String.hashCode` equals `Character.hashCode`. */
  protected collectInvalidCharacters(value: string): JavaHashSet<string> | null {
    let result: JavaHashSet<string> | null = null;
    for (let i = 0; i < value.length; i++) {
      if (isValidIdCharacter(value.charCodeAt(i), i)) continue;
      result ??= new JavaHashSet(STRING);
      result.add(value.charAt(i));
    }
    return result;
  }

  toValue(string: string | null, _node: INode | null): string | null {
    if (string === null) return null;
    return string.startsWith(ESCAPE_PREFIX) ? string.substring(1) : string;
  }
}
