// SPDX-License-Identifier: EPL-2.0
import { ElkPadding } from '../../../core/math/ElkPadding.js';

/**
 * A mere copycat of {@link ElkPadding}. We use it for a single reason: to make a clear distinction between ELK's
 * padding and the (intermediate) padding used during the execution of ELK Layered.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LPadding.java
 */
export class LPadding extends ElkPadding {
  /** Creates a new instance with all fields set to `0.0`. */
  constructor() {
    super();
  }

  /** Returns an exact copy of this padding. */
  override clone(): LPadding {
    const clone = new LPadding();
    clone.setLeft(this.getLeft());
    clone.setRight(this.getRight());
    clone.setTop(this.getTop());
    clone.setBottom(this.getBottom());
    return clone;
  }
}
