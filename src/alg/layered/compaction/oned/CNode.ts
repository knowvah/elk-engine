// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import type { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { toString as doubleToString } from '../../../../java/lang/DoubleToString.js';
import { identityHashCode } from '../../../../java/lang/IdentityHashCode.js';
import * as JavaMath from '../../../../java/lang/JavaMath.js';
import type { CGroup } from './CGroup.js';
import { Quadruplet } from './Quadruplet.js';

/**
 * Representation of a node/box in the constraint graph.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/compaction/oned/CNode.java
 */
export abstract class CNode {
  // Variables are public for convenience reasons since this class is used internally only.
  /** containing {@link CGroup}. */
  cGroup: CGroup | null = null;
  /** refers to the parent node of a north/south segment. */
  parentNode: CNode | null = null;
  /** representation of constraints. */
  constraints: CNode[] = [];
  /** the area occupied by this element including margins for ports and labels. */
  hitbox: ElkRectangle = null as never;
  /** offset to the root position of the containing {@link CGroup} . */
  cGroupOffset: KVector = new KVector();
  /**
   * leftmost possible position for this {@link CNode} to be drawn.
   * This position can be intermediate and is increased to its final value by updateStartPos().
   */
  startPos: number = Number.NEGATIVE_INFINITY;
  /** flags a {@link CNode} to be repositioned in the case of left/right balanced compaction. */
  reposition = true;
  /**
   * a 4-tuple stating if the {@link CNode} should locked in a particular direction based on
   * conditions defined in an extended class.
   */
  lock: Quadruplet = new Quadruplet();
  /** Whether no spacing should be applied to a certain side of this node. */
  spacingIgnore: Quadruplet = new Quadruplet();
  /** An id for public use. There is no warranty, use at your own risk. */
  id = 0;

  /**
   * Returns the required horizontal spacing to the specified {@link CNode}.
   *
   * @returns the spacing
   */
  abstract getHorizontalSpacing(): number;

  /**
   * Returns the required vertical spacing to the specified {@link CNode}.
   *
   * @returns the spacing
   */
  abstract getVerticalSpacing(): number;

  /**
   * Getter for the position.
   *
   * @returns position of the hitbox
   */
  getPosition(): number {
    return this.hitbox.x;
  }

  /**
   * Applies the compacted starting position to the hitbox. Used after compaction to allow
   * reverse transformation of hitboxes.
   */
  applyPosition(): void {
    this.hitbox.x = this.startPos;
  }

  /** Sets the position of the LGraphElement according to the hitbox. */
  abstract applyElementPosition(): void;

  /**
   * Returns the position of the LGraphElement.
   *
   * @returns the position
   */
  abstract getElementPosition(): number;

  /**
   * (`protected` in Java, also called by {@link OneDimensionalCompactor} of the same package;
   * TypeScript has no package access.)
   *
   * @returns an svg representation of this {@link CNode} to the output for debugging.
   */
  getDebugSVG(): string {
    const hb = this.hitbox;
    let sb = '';
    sb +=
      `<rect x="${doubleToString(hb.x)}" y="${doubleToString(hb.y)}" width="${doubleToString(Math.max(1, hb.width))}" ` +
      `height="${doubleToString(Math.max(1, hb.height))}" fill="${this.reposition ? 'green' : 'orange'}" ` +
      'stroke="black" opacity="0.5"/>';
    sb +=
      `<text x="${doubleToString(hb.x + 2)}" y="${doubleToString(hb.y + 2 * 2 * 2 + 2 + 1)}">` +
      `(${JavaMath.round(hb.x)}, ${JavaMath.round(hb.y)})\n${this.toString()}</text>`;
    return sb;
  }

  toString(): string {
    // Java's Object.toString(): class name and identity hash code (the hash is not the JVM's).
    return `org.eclipse.elk.alg.layered.compaction.oned.CNode@${identityHashCode(this).toString(16)}`;
  }
}
