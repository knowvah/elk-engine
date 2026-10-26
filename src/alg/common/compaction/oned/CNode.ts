// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../core/math/KVector.js';
import type { ElkRectangle } from '../../../../core/math/ElkRectangle.js';
import { toString as doubleToString } from '../../../../java/lang/DoubleToString.js';
import { identityHashCode } from '../../../../java/lang/IdentityHashCode.js';
import * as JavaMath from '../../../../java/lang/JavaMath.js';
import type { CGroup } from './CGroup.js';
import { CNodeBuilder } from './CNodeCNodeBuilder.js';

/**
 * Representation of a node/box in the constraint graph.
 *
 * Use {@link CNode.of} to construct a new instance. The method returns a builder object that is finalized using
 * {@link CNodeBuilder.create}.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/oned/CNode.java
 */
export class CNode {
  // Variables are public for convenience reasons.

  /* -------------- Publicly Usable Fields -------------- */
  /** An optional id for public use (not used internally). There is no warranty, use at your own risk. */
  id = 0;
  /** Element this node originates from; for public use (not used internally). */
  origin: unknown = null;
  /** A more precise specification of what this node represents (not used internally). */
  type: string | null = null;
  /** A function called by {@link toString}. May be used for debugging. */
  toStringDelegate: ((node: CNode) => string) | null = null;

  /* -------------- Group Information -------------- */
  /** containing {@link CGroup}. */
  cGroup: CGroup | null = null;
  /** offset to the root position of the containing {@link CGroup} . */
  cGroupOffset: KVector = new KVector();

  /* -------------- Specification -------------- */
  /** the area occupied by this node prior to compaction. */
  hitboxPreCompaction: ElkRectangle = null as never;
  /** the area occupied by this node. */
  hitbox: ElkRectangle = null as never;

  /* -------------- Transient Data -------------- */
  /** Constraints of this node as determined by a {@link IConstraintCalculationAlgorithm}. */
  constraints: CNode[] = [];
  /**
   * Leftmost possible position for this {@link CNode} to be drawn.
   * This position may be intermediate as it is modified during the compaction process.
   */
  startPos: number = Number.NEGATIVE_INFINITY;

  /** Private in Java; TypeScript cannot give {@link CNodeBuilder} access to a private constructor. Use {@link of}. */
  constructor() {}

  /**
   * @returns a {@link CNodeBuilder} to construct a new node.
   */
  static of(): CNodeBuilder {
    return new CNodeBuilder();
  }

  /**
   * @returns an svg representation of this {@link CNode} to the output for debugging.
   */
  getDebugSVG(): string {
    const hb = this.hitbox;
    let sb = '';
    sb +=
      `<rect x="${doubleToString(hb.x)}" y="${doubleToString(hb.y)}" width="${doubleToString(Math.max(1, hb.width))}" ` +
      `height="${doubleToString(Math.max(1, hb.height))}" fill="green" stroke="black" opacity="0.5"/>`; // (this.reposition ? "green" : "orange")
    sb +=
      `<text x="${doubleToString(hb.x + 2)}" y="${doubleToString(hb.y + 2 * 2 * 2 + 2 + 1)}">` +
      `(${JavaMath.round(hb.x)}, ${JavaMath.round(hb.y)})\n${this.toString()}</text>`;
    return sb;
  }

  toString(): string {
    if (this.toStringDelegate !== null) {
      return this.toStringDelegate(this);
    }
    // Java's Object.toString(): class name and identity hash code (the hash is not the JVM's).
    return `org.eclipse.elk.alg.common.compaction.oned.CNode@${identityHashCode(this).toString(16)}`;
  }
}
