// SPDX-License-Identifier: EPL-2.0
import { ElkMath } from '../../../core/math/ElkMath.js';
import type { KVector } from '../../../core/math/KVector.js';
import { KVectorChain } from '../../../core/math/KVectorChain.js';
import { MapPropertyHolder } from '../../../graph/properties/MapPropertyHolder.js';
import { identityHashCode } from '../../../java/lang/IdentityHashCode.js';
import type { FBendpoint } from './FBendpoint.js';
import type { FLabel } from './FLabel.js';
import type { FNode } from './FNode.js';

/**
 * A physico-virtual representation of an edge, including a list of associated bend points.
 *
 * @author owo
 * @see org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force/graph/FEdge.java
 */
export class FEdge extends MapPropertyHolder {
  /** the bend points of the edge. */
  private readonly bendpoints: FBendpoint[] = [];
  /** the labels of the edge. */
  private readonly labels: FLabel[] = [];
  /** the source node of the edge. */
  private source: FNode | null = null;
  /** the target node of the edge. */
  private target: FNode | null = null;

  /** The fallback text uses the identity-hash counter (`identityHashCode`, TR9), not the JVM's `hashCode()`. */
  override toString(): string {
    if (this.source !== null && this.target !== null) {
      return `${this.source.toString()}->${this.target.toString()}`;
    } else {
      return `e_${String(identityHashCode(this))}`;
    }
  }

  /**
   * Returns the source node.
   *
   * @return the source node
   */
  getSource(): FNode | null {
    return this.source;
  }

  /**
   * Returns the target node.
   *
   * @return the target node
   */
  getTarget(): FNode | null {
    return this.target;
  }

  /**
   * Returns the list of bend points associated with this edge.
   *
   * @return list of bend points
   */
  getBendpoints(): FBendpoint[] {
    return this.bendpoints;
  }

  /**
   * Returns the list of labels associated with this edge.
   *
   * @return list of labels
   */
  getLabels(): FLabel[] {
    return this.labels;
  }

  /**
   * Returns the docking point at the source node. A null source or target is a Java `NullPointerException`, raised
   * here as the `TypeError` of the non-null assertions.
   *
   * @return the source docking point
   */
  getSourcePoint(): KVector {
    const source = this.source!;
    const v = this.target!.getPosition().clone().sub(source.getPosition());
    ElkMath.clipVector(v, source.getSize().x, source.getSize().y);
    return v.add(source.getPosition());
  }

  /**
   * Returns the docking point at the target node.
   *
   * @return the target docking point
   */
  getTargetPoint(): KVector {
    const target = this.target!;
    const v = this.source!.getPosition().clone().sub(target.getPosition());
    ElkMath.clipVector(v, target.getSize().x, target.getSize().y);
    return v.add(target.getPosition());
  }

  /**
   * Sets the source vertex.
   *
   * @param theSource the source vertex set to
   */
  setSource(theSource: FNode | null): void {
    this.source = theSource;
  }

  /**
   * Sets the target vertex.
   *
   * @param theTarget the target vertex
   */
  setTarget(theTarget: FNode | null): void {
    this.target = theTarget;
  }

  /**
   * Returns a vector chain with all bend points and source and target point.
   *
   * @return a vector chain for the edge
   */
  toVectorChain(): KVectorChain {
    const vectorChain = new KVectorChain();
    vectorChain.add(this.getSourcePoint());
    for (const bendPoint of this.bendpoints) {
      vectorChain.add(bendPoint.getPosition());
    }
    vectorChain.add(this.getTargetPoint());
    return vectorChain;
  }

  /** Distribute the bend points evenly on the edge. */
  distributeBendpoints(): void {
    const count = this.bendpoints.length;
    if (count > 0) {
      const sourcePos = this.source!.getPosition();
      const targetPos = this.target!.getPosition();
      const incr = targetPos
        .clone()
        .sub(sourcePos)
        .scale(1 / (count + 1));
      const pos = sourcePos.clone();
      for (const bendPoint of this.bendpoints) {
        bendPoint.getPosition().x = pos.x + incr.x;
        bendPoint.getPosition().y = pos.y + incr.y;
        pos.add(incr);
      }
    }
  }
}
