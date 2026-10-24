// SPDX-License-Identifier: EPL-2.0
import type { ElkLabel } from '../../../graph/ElkLabel.js';
import { LabelSide } from '../../options/LabelSide.js';
import { AbstractElkGraphElementAdapter } from './ElkGraphAdaptersAbstractElkGraphElementAdapter.js';
import type { GraphAdapters } from './GraphAdapters.js';

/**
 * Adapter for `ElkLabel`s. Java: private nested class (the constructor is public here only so that sibling
 * files can create instances; the class is not exported from the facade).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/adapters/ElkGraphAdapters.java
 */
export class ElkLabelAdapter
  extends AbstractElkGraphElementAdapter<ElkLabel>
  implements GraphAdapters.LabelAdapter<ElkLabel>
{
  /**
   * Creates a new adapter for the given label.
   *
   * @param label the label to adapt.
   */
  constructor(label: ElkLabel) {
    super(label);
  }

  getSide(): LabelSide {
    return this.element.getProperty(LabelSide.LABEL_SIDE);
  }

  getText(): string {
    return this.element.getText() as string;
  }
}
