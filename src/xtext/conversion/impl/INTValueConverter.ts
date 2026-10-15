// SPDX-License-Identifier: EPL-2.0
import { checkCast, isNumber } from '../../../java/lang/JavaCast.js';
import { JavaClass } from '../../../java/lang/JavaClass.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { NumberFormatException } from '../../../java/lang/NumberFormatException.js';
import type { INode } from '../../nodemodel/INode.js';
import * as Strings from '../../util/Strings.js';
import { ValueConverterException } from '../ValueConverterException.js';
import { AbstractLexerBasedConverter, type TokenSource } from './AbstractLexerBasedConverter.js';

/**
 * @see org.eclipse.xtext/src/org/eclipse/xtext/conversion/impl/INTValueConverter.java
 */
export class INTValueConverter extends AbstractLexerBasedConverter<number> {
  constructor(tokenSource: TokenSource | null = null) {
    super(tokenSource);
  }

  protected override toEscapedString(value: number): string {
    return String(value);
  }

  protected override assertValidValue(value: number | null): void {
    // the JVM bridge of assertValidValue(Integer) casts the erased value first
    checkCast(value, isNumber, JavaClass.Integer.javaName);
    super.assertValidValue(value);
    if ((value as number) < 0) {
      throw new ValueConverterException(
        `${this.getRuleName()}-value may not be negative (value: ${value}).`,
        null,
        null,
      );
    }
  }

  toValue(string: string | null, node: INode | null): number {
    if (Strings.isEmpty(string)) {
      throw new ValueConverterException("Couldn't convert empty string to an int value.", node, null);
    }
    try {
      return JavaInteger.valueOf(string as string);
    } catch (e) {
      if (e instanceof NumberFormatException) {
        throw new ValueConverterException(`Couldn't convert '${string}' to an int value.`, node, e);
      }
      throw e;
    }
  }
}
