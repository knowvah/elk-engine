// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { AbstractRule } from '../../../xtext/AbstractRule.js';
import { IDValueConverter } from '../../../xtext/conversion/impl/IDValueConverter.js';
import type { TokenSource } from '../../../xtext/conversion/impl/AbstractLexerBasedConverter.js';
import type { IQualifiedNameConverter } from '../../../xtext/naming/IQualifiedNameConverter.js';
import { QualifiedName } from '../../../xtext/naming/QualifiedName.js';
import * as Strings from '../../../xtext/util/Strings.js';

/** The grammar's `ID` rule (`grammarAccess.IDRule`): the inherited terminal of `org.eclipse.xtext.common.Terminals`. */
export const ID_RULE: AbstractRule = {
  getName: () => 'ID',
  isTerminalRule: () => true,
};

/**
 * The `@Inject initialize(Provider<IDValueConverter>, ElkGraphGrammarAccess)` of the Xtend converters: a fresh
 * `IDValueConverter` over the grammar's keywords whose rule is `ID`. Shared by the qualified name converter and
 * `PropertyKeyValueConverter`, which both build one this way.
 */
export function createIdValueConverter(
  tokenSource: TokenSource | null,
  keywords: ReadonlySet<string>,
): IDValueConverter {
  const converter = new IDValueConverter(keywords, tokenSource);
  converter.setRule(ID_RULE);
  return converter;
}

/**
 * Converts qualified names to dotted text and back, escaping every segment like an `ID`.
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/naming/ElkGraphQualifiedNameConverter.xtend
 */
export class ElkGraphQualifiedNameConverter implements IQualifiedNameConverter {
  static readonly DELIMITER = '.';

  readonly #idValueConverter: IDValueConverter;

  constructor(tokenSource: TokenSource | null, keywords: ReadonlySet<string>) {
    this.#idValueConverter = createIdValueConverter(tokenSource, keywords);
  }

  /** @throws IllegalArgumentException for `null` and empty text (`null` is admitted for the Java null check). */
  toQualifiedName(qualifiedNameAsText: string | null): QualifiedName {
    if (qualifiedNameAsText === null) {
      throw new IllegalArgumentException('Qualified name cannot be null');
    }
    if (qualifiedNameAsText.length === 0) {
      throw new IllegalArgumentException('Qualified name cannot be empty');
    }
    const segs = Strings.split(qualifiedNameAsText, ElkGraphQualifiedNameConverter.DELIMITER).map((segment) =>
      this.#idValueConverter.toValue(segment, null),
    );
    return QualifiedName.createFromList(segs);
  }

  /**
   * @throws IllegalArgumentException for `null`
   * @throws ValueConverterException when a segment is no valid `ID`
   */
  toString(name: QualifiedName | null): string {
    if (name === null) {
      throw new IllegalArgumentException('Qualified name cannot be null');
    }
    return name
      .getSegments()
      .map((segment) => this.#idValueConverter.toString(segment))
      .join(ElkGraphQualifiedNameConverter.DELIMITER);
  }
}
