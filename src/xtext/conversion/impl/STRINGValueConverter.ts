// SPDX-License-Identifier: EPL-2.0
import { checkCast, isString } from '../../../java/lang/JavaCast.js';
import { JavaClass } from '../../../java/lang/JavaClass.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { INode } from '../../nodemodel/INode.js';
import { JavaStringConverter } from '../../util/JavaStringConverter.js';
import * as Strings from '../../util/Strings.js';
import { ValueConverterException } from '../ValueConverterException.js';
import { ValueConverterWithValueException } from '../ValueConverterWithValueException.js';
import { AbstractLexerBasedConverter, type TokenSource } from './AbstractLexerBasedConverter.js';
import { Implementation, type StringLiteralOwner } from './STRINGValueConverter.Implementation.js';

const QUOTE = '"';
const INVALID_ESCAPE_MESSAGE = 'Invalid escape sequence (valid ones are  \\b  \\t  \\n  \\f  \\r  \\"  \\\'  \\\\ )';
const NOT_CLOSED_MESSAGE = 'String literal is not properly closed';

/**
 * @see org.eclipse.xtext/src/org/eclipse/xtext/conversion/impl/STRINGValueConverter.java
 */
export class STRINGValueConverter extends AbstractLexerBasedConverter<string> implements StringLiteralOwner {
  constructor(tokenSource: TokenSource | null = null) {
    super(tokenSource);
  }

  protected override toEscapedString(value: string): string {
    // the JVM bridge of toEscapedString(String) casts the erased value (assertValidValue is not overridden)
    checkCast(value, isString, JavaClass.String.javaName);
    return QUOTE + Strings.convertToJavaString(value, false) + QUOTE;
  }

  toValue(string: string | null, node: INode | null): string | null {
    if (string === null) return null;
    try {
      if (string.length === 1) {
        throw new ValueConverterWithValueException(this.getStringNotClosedMessage(), node, '', null);
      }
      return this.convertFromString(string, node);
    } catch (e) {
      if (e instanceof IllegalArgumentException) {
        throw new ValueConverterException(e.message, node, e);
      }
      throw e;
    }
  }

  /**
   * Converts a string literal (including leading and trailing single or double quote) to a semantic
   * string value. Recovers from invalid escape sequences and announces the first problem with a
   * {@link ValueConverterWithValueException}.
   */
  protected convertFromString(literal: string, node: INode | null): string {
    const converter = this.createConverter();
    const result = converter.convertFromJavaString(literal);
    if (converter.errorMessage !== null) {
      throw new ValueConverterWithValueException(converter.errorMessage, node, result, null, {
        offset: converter.errorIndex,
        length: converter.errorLength,
      });
    }
    return result;
  }

  protected createConverter(): Implementation {
    return new Implementation(this);
  }

  /** Public (Java: protected) because the extracted `Implementation` class reads it through its owner. */
  getInvalidEscapeSequenceMessage(): string {
    return INVALID_ESCAPE_MESSAGE;
  }

  /** Public (Java: protected), see {@link STRINGValueConverter.getInvalidEscapeSequenceMessage}. */
  getStringNotClosedMessage(): string {
    return NOT_CLOSED_MESSAGE;
  }

  /** Public (Java: protected), see {@link STRINGValueConverter.getInvalidEscapeSequenceMessage}. */
  isHexSequence(input: string, off: number, chars: number): boolean {
    return JavaStringConverter.doIsHexSequence(input, off, chars);
  }
}
