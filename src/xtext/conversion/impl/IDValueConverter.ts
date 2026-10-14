// SPDX-License-Identifier: EPL-2.0
import { AbstractIDValueConverter } from './AbstractIDValueConverter.js';
import type { TokenSource } from './AbstractLexerBasedConverter.js';

/**
 * Escapes the grammar's keywords with `^`. `GrammarUtil.getAllKeywords(grammar)` (keywords of parser and
 * enum rules only) is the constructor input `valuesToEscape`.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/conversion/impl/IDValueConverter.java
 * @see org.eclipse.xtext/src/org/eclipse/xtext/GrammarUtil.java:553-570
 */
export class IDValueConverter extends AbstractIDValueConverter {
  readonly #valuesToEscape: ReadonlySet<string>;

  constructor(valuesToEscape: ReadonlySet<string>, tokenSource: TokenSource | null = null) {
    super(tokenSource);
    this.#valuesToEscape = new Set(valuesToEscape);
  }

  protected override computeValuesToEscape(): ReadonlySet<string> {
    return this.#valuesToEscape;
  }

  protected override mustEscape(value: string): boolean {
    return this.getValuesToEscape().has(value);
  }
}
