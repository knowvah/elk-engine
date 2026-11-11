// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import { TGraphElement } from './TGraphElement.js';

/**
 * Abstract superclass for {@link TGraphElement}s that can have a position and a size.
 *
 * @author sor
 * @author sgu
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/graph/TShape.java
 */
export abstract class TShape extends TGraphElement {
  /** the current position of the element. */
  private readonly pos: KVector = new KVector();
  /** the size of the element. */
  private readonly size: KVector = new KVector();

  /**
   * Creates a shape in the context of the given graph. Covers the Java constructors `TShape(int id)` and the implicit
   * `TShape()`.
   *
   * @param id the identifier
   */
  constructor(id: number = 0) {
    super(id);
  }

  /**
   * Returns the element's current position. For nodes this is the coordinates of their center point, for other
   * elements the coordinates of the upper left corner.
   *
   * @return the position
   */
  getPosition(): KVector {
    return this.pos;
  }

  /**
   * Returns the element's current size.
   *
   * @return the size
   */
  getSize(): KVector {
    return this.size;
  }
}
