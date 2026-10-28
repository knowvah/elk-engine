// SPDX-License-Identifier: EPL-2.0
import { LabelSide } from '../../../core/options/LabelSide.js';
import type { GraphAdapters } from '../../../core/util/adapters/GraphAdapters.js';
import { AbstractLShapeAdapter } from './LGraphAdaptersAbstractLShapeAdapter.js';
import type { LLabel } from './LLabel.js';

/**
 * Adapter for {@link LLabel}s.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LGraphAdapters.java
 */
export class LLabelAdapter extends AbstractLShapeAdapter<LLabel> implements GraphAdapters.LabelAdapter<LLabel> {
  /**
   * Creates a new adapter for the given label.
   *
   * @param element the label to be adapted.
   */
  constructor(element: LLabel) {
    super(element);
  }

  getSide(): LabelSide {
    return this.element.getProperty(LabelSide.LABEL_SIDE);
  }

  getText(): string {
    return this.element.getText();
  }
}
