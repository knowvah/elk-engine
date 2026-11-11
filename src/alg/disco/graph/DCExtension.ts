// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import type { DCDirection } from './DCDirection.js';
import type { DCElement } from './DCElement.js';

/**
 * Models short hierarchical edges conceptually as semi-indefinite strips ending in a {@link DCElement}.
 *
 * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCExtension.java
 */
export class DCExtension {
  private parent: DCElement;
  private direction: DCDirection;
  // The offset is not centered in the extension but denotes the top-left corner in the respective coordinate system
  // (origin in top-left corner of the display)
  private offset!: KVector;
  private width: number;

  /**
   * Creates a beam-like extension.
   *
   * @param parent Element this extension is going to be attached to
   * @param direction The cardinal direction this extension points to
   * @param middlePos The exact point the extension attaches to its element. If the extensions has a greater width than
   *     1 unit, the point cuts the beam exactly in half.
   * @param width Width of the extension
   */
  constructor(parent: DCElement, direction: DCDirection, middlePos: KVector, width: number) {
    this.parent = parent;
    this.direction = direction;
    this.width = width;

    const bounds = parent.getBounds();
    this.setOffset(new KVector(-bounds.x, -bounds.y));
    this.getOffset().add(middlePos);
    // adjust position so that the Vector describes the left bound of the extension when viewed clock wise;
    const halfWidth = width / 2;
    // If horizontal extension ...
    if (direction.isHorizontal()) {
      // ... subtract half the width vertically
      this.getOffset().sub(0, halfWidth);
    } else {
      // other case is analog
      this.getOffset().sub(halfWidth, 0);
    }

    parent.addExtension(this);
  }

  /**
   * Returns the element this extension is attached to.
   *
   * @returns the parent Element this extension is attached to
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCExtension.java
   */
  getParent(): DCElement {
    return this.parent;
  }

  /**
   * Returns the cardinal direction of this extension.
   *
   * @returns the direction The cardinal direction of this extension.
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCExtension.java
   */
  getDirection(): DCDirection {
    return this.direction;
  }

  /**
   * Retruns the offset of the extension relative to the upper left corner of its element.
   *
   * @returns the offset offset relative to the element of the extension
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCExtension.java
   */
  getOffset(): KVector {
    return this.offset;
  }

  /**
   * Returns the width of the extensions.
   *
   * @returns the width
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCExtension.java
   */
  getWidth(): number {
    return this.width;
  }

  /**
   * Explicitly sets the offset of the extension relative to its element.
   *
   * @param offset the offset to set
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCExtension.java
   */
  private setOffset(offset: KVector): void {
    this.offset = offset;
  }
}
