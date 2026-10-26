// SPDX-License-Identifier: EPL-2.0
import { fuzzyCompare } from '../../../guava/DoubleMath.js';
import { ElkMath } from '../../../core/math/ElkMath.js';
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import type { KVector } from '../../../core/math/KVector.js';
import { Utils } from '../utils/Utils.js';
import { InternalProperties } from './InternalProperties.js';

/**
 * Representation of a node as a rectangle and center point.
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/spore/Node.java
 */
export class Node {
  /** The original center point from the time of creation. Used to match the object this node was derived from. */
  originalVertex: KVector;
  /** A modifiable center position to that a translation can be applied. */
  vertex: KVector;
  /** The bounding box of the represented diagram element. */
  rect: ElkRectangle;

  /**
   * Constructor initializing the rectangle and center point.
   *
   * @param v center point, also used for identification
   * @param r rectangle
   */
  constructor(v: KVector, r: ElkRectangle) {
    this.originalVertex = v;
    this.vertex = this.originalVertex.clone();
    this.rect = new ElkRectangle(r);
  }

  /**
   * Translate the rectangle and modifiable center position by vector v.
   *
   * @param v the translation vector
   */
  translate(v: KVector): void {
    this.vertex.add(v);
    this.rect.x += v.x;
    this.rect.y += v.y;
  }

  /**
   * Helper to keep the center position and rectangle consistent.
   *
   * @param p new center position
   */
  setCenterPosition(p: KVector): void {
    this.translate(p.clone().sub(this.vertex));
  }

  /**
   * Returns the underlap between two nodes, i.e. how far the nodes can be pushed together on the line connecting
   * their centers without collision.
   *
   * @param other the other node
   * @returns the underlap
   */
  underlap(other: Node): number {
    const rect = this.rect;
    const horizontalCenterDistance = Math.abs(rect.getCenter().x - other.rect.getCenter().x);
    const verticalCenterDistance = Math.abs(rect.getCenter().y - other.rect.getCenter().y);
    let horizontalUnderlap = 0;
    let verticalUnderlap = 0;
    let hScale = 1;
    let vScale = 1;
    if (horizontalCenterDistance > rect.width / 2.0 + other.rect.width / 2.0) {
      horizontalUnderlap = Math.min(
        Math.abs(rect.x - (other.rect.x + other.rect.width)),
        Math.abs(rect.x + rect.width - other.rect.x),
      );
      hScale = 1 - horizontalUnderlap / horizontalCenterDistance;
    }
    if (verticalCenterDistance > rect.height / 2.0 + other.rect.height / 2.0) {
      verticalUnderlap = Math.min(
        Math.abs(rect.y - (other.rect.y + other.rect.height)),
        Math.abs(rect.y + rect.height - other.rect.y),
      );
      vScale = 1 - verticalUnderlap / verticalCenterDistance;
    }
    const scale = Math.min(hScale, vScale);
    return (
      (1 - scale) *
      Math.sqrt(horizontalCenterDistance * horizontalCenterDistance + verticalCenterDistance * verticalCenterDistance)
    );
  }

  /**
   * Distance between two nodes, i.e. how far the other node can be moved in the direction of v without colliding
   * with this node.
   *
   * @param other the other node
   * @param v the direction
   * @returns the direction dependent distance
   */
  distance(other: Node, v: KVector): number {
    let result = Number.POSITIVE_INFINITY;
    for (const e1 of Utils.getRectEdges(this.rect)) {
      for (const e2 of Utils.getRectEdges(other.rect)) {
        const distance = ElkMath.distance(e1.u, e1.v, e2.u, e2.v, v);
        result = Math.min(result, distance);
      }
    }
    return result;
  }

  /**
   * Determines if two nodes touch.
   *
   * @param other the other node
   * @returns true if they touch
   */
  touches(other: Node): boolean {
    const f = InternalProperties.FUZZINESS;
    return (
      fuzzyCompare(this.rect.x, other.rect.x + other.rect.width, f) <= 0 &&
      fuzzyCompare(other.rect.x, this.rect.x + this.rect.width, f) <= 0 &&
      fuzzyCompare(this.rect.y, other.rect.y + other.rect.height, f) <= 0 &&
      fuzzyCompare(other.rect.y, this.rect.y + this.rect.height, f) <= 0
    );
  }
}
