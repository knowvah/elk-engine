// SPDX-License-Identifier: EPL-2.0
import type { EDataType } from '../../../emf/ecore/EDataType.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import type { AbstractRule } from '../../AbstractRule.js';
import type { INode } from '../../nodemodel/INode.js';
import { ValueConverterException } from '../ValueConverterException.js';
import { AbstractLexerBasedConverter, type TokenSource } from './AbstractLexerBasedConverter.js';

const CONVERSION_ERROR_MESSAGE = 'Error converting string to value';

/**
 * Converts a terminal rule's text through the `EFactory` of the rule's `EDataType`. Java's constructor is
 * protected and reached only by the nested `Factory`; both live in this file, so the constructor is public here.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/conversion/impl/DefaultTerminalConverter.java
 */
export class DefaultTerminalConverter extends AbstractLexerBasedConverter<unknown> {
  #dataType: EDataType | null = null;

  constructor(tokenSource: TokenSource | null = null) {
    super(tokenSource);
  }

  setDataType(dataType: EDataType): void {
    this.#dataType = dataType;
  }

  toValue(string: string | null, node: INode | null): unknown {
    try {
      const dataType = this.getDataType();
      return dataType.getEPackage().getEFactoryInstance().createFromString(dataType, string);
    } catch (exc) {
      // Java `catch (Exception exc)`: the port's NullPointerException stand-in (`TypeError`) is caught too.
      throw new ValueConverterException(CONVERSION_ERROR_MESSAGE, node, exc as Error);
    }
  }

  protected override toEscapedString(value: unknown): string {
    const dataType = this.getDataType();
    // Java returns the factory's `String` unchecked; `null` is unreachable here because `toString` rejects null
    // values before this call and the factory maps non-null values to non-null strings.
    return dataType.getEPackage().getEFactoryInstance().convertToString(dataType, value) as string;
  }

  private getDataType(): EDataType {
    if (this.#dataType === null) {
      // Java would raise a NullPointerException on the unset field.
      throw new IllegalStateException('setDataType was not called before the converter was used');
    }
    return this.#dataType;
  }
}

/**
 * Creates the converters for terminal rules (Java: the nested `DefaultTerminalConverter.Factory`, whose
 * `Provider<DefaultTerminalConverter>` also injects the optional lexer; here the factory carries the token
 * source).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/conversion/impl/DefaultTerminalConverter.java
 */
export class Factory {
  readonly #tokenSource: TokenSource | null;

  constructor(tokenSource: TokenSource | null = null) {
    this.#tokenSource = tokenSource;
  }

  /** @param dataType Java `(EDataType) terminalRule.getType().getClassifier()`. */
  create(terminalRule: AbstractRule, dataType: EDataType): DefaultTerminalConverter {
    const defaultTerminalConverter = new DefaultTerminalConverter(this.#tokenSource);
    defaultTerminalConverter.setDataType(dataType);
    defaultTerminalConverter.setRule(terminalRule);
    return defaultTerminalConverter;
  }
}
