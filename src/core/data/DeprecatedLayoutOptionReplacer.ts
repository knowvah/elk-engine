// SPDX-License-Identifier: EPL-2.0
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import type { IProperty } from '../../graph/properties/IProperty.js';
import { of as immutableMapOf } from '../../guava/ImmutableMap.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { PortLabelPlacement } from '../options/PortLabelPlacement.js';
import { SizeOptions } from '../options/SizeOptions.js';
import type { IGraphElementVisitor } from '../util/IGraphElementVisitor.js';

type Rule = (element: ElkGraphElement) => void;

/**
 * Rule to replace {@link CoreOptions.PORT_LABELS_NEXT_TO_PORT_IF_POSSIBLE}.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/DeprecatedLayoutOptionReplacer.java
 */
const NEXT_TO_PORT_IF_POSSIBLE: Rule = (e) => {
  e.getProperty(CoreOptions.PORT_LABELS_PLACEMENT)!.add(PortLabelPlacement.NEXT_TO_PORT_IF_POSSIBLE);
  e.setProperty(CoreOptions.PORT_LABELS_NEXT_TO_PORT_IF_POSSIBLE, null);
};

/**
 * Rule to move the deprecated enum value {@link SizeOptions.SPACE_EFFICIENT_PORT_LABELS} to
 * {@link PortLabelPlacement}.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/DeprecatedLayoutOptionReplacer.java
 */
const SPACE_EFFICIENT: Rule = (e) => {
  if (e.getProperty(CoreOptions.NODE_SIZE_OPTIONS)!.contains(SizeOptions.SPACE_EFFICIENT_PORT_LABELS)) {
    e.getProperty(CoreOptions.PORT_LABELS_PLACEMENT)!.add(PortLabelPlacement.SPACE_EFFICIENT);
    e.getProperty(CoreOptions.NODE_SIZE_OPTIONS)!.remove(SizeOptions.SPACE_EFFICIENT_PORT_LABELS);
  }
};

/**
 * Replaces (and removes) any deprecated layout options from {@link CoreOptions} with a corresponding new layout
 * option (or whatever is required to reconstruct the old behavior).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/DeprecatedLayoutOptionReplacer.java
 */
export class DeprecatedLayoutOptionReplacer implements IGraphElementVisitor {
  /** Mapping of deprecated layout options to replacing rules. */
  static readonly RULES: ReadonlyMap<IProperty<unknown>, Rule> = immutableMapOf<IProperty<unknown>, Rule>(
    CoreOptions.PORT_LABELS_NEXT_TO_PORT_IF_POSSIBLE as IProperty<unknown>,
    NEXT_TO_PORT_IF_POSSIBLE,
    CoreOptions.NODE_SIZE_OPTIONS as IProperty<unknown>,
    SPACE_EFFICIENT,
  );

  visit(element: ElkGraphElement): void {
    DeprecatedLayoutOptionReplacer.RULES.forEach((replacer, option) => {
      if (element.hasProperty(option)) {
        replacer(element);
        // Note that the option is _not_ removed here. The replacer has to take care of it;
        // It depends on the concrete layout option whether it should be removed or not.
      }
    });
  }
}
