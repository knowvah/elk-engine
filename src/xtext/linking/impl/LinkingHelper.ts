// SPDX-License-Identifier: EPL-2.0
import { ValueConverterException } from '../../conversion/ValueConverterException.js';
import { ValueConverterWithValueException } from '../../conversion/ValueConverterWithValueException.js';
import type { IValueConverterService } from '../../conversion/IValueConverterService.js';
import type { ICrossReferenceNode } from '../../nodemodel/ICrossReferenceNode.js';
import { IllegalNodeException } from './IllegalNodeException.js';

function stringOrNull(result: unknown): string | null {
  return result !== null && result !== undefined ? String(result) : null;
}

/**
 * Reads the link text of a cross-reference node. `getRuleNameFrom`/`getRuleFrom` (grammar walkers over
 * `Keyword`/`RuleCall`/`CrossReference`) reduce to the node's `ruleName` field, which the parser records;
 * the `ruleName == null` early return cannot occur because the field is always set. The Java setter
 * `setValueConverter` is the constructor parameter.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/impl/LinkingHelper.java
 */
export class LinkingHelper {
  readonly #valueConverter: IValueConverterService;

  constructor(valueConverter: IValueConverterService) {
    this.#valueConverter = valueConverter;
  }

  /**
   * @throws IllegalNodeException when the converter rejects the text
   */
  getCrossRefNodeAsString(node: ICrossReferenceNode, convert: boolean): string | null {
    const convertMe = node.getText();
    if (!convert) return convertMe;
    try {
      return stringOrNull(this.#valueConverter.toValue(convertMe, node.ruleName, node));
    } catch (ex) {
      if (ex instanceof ValueConverterWithValueException) return stringOrNull(ex.getValue());
      if (ex instanceof ValueConverterException) throw new IllegalNodeException(node, ex);
      throw ex;
    }
  }
}
