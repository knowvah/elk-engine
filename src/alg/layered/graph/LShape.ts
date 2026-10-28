// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import { LGraphElement } from './LGraphElement.js';

/**
 * Abstract superclass for {@link LGraphElement}s that can have a position and a size.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LShape.java
 */
export abstract class LShape extends LGraphElement {
  /** the current position of the element. */
  private readonly pos = new KVector();
  /** the size of the element. */
  private readonly size = new KVector();

  /**
   * Returns the element's current position. This is the coordinate of the element's upper left corner. May be
   * modified.
   */
  getPosition(): KVector {
    return this.pos;
  }

  /** Returns the element's current size. May be modified. */
  getSize(): KVector {
    return this.size;
  }
}
