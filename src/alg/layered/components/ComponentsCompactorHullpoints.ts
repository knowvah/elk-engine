// SPDX-License-Identifier: EPL-2.0
import { ElkRectangle } from '../../../core/math/ElkRectangle.js';
import { KVector } from '../../../core/math/KVector.js';
import { Point } from '../compaction/recthull/Point.js';

/**
 * Java's `ArrayList<Point>` extension, keeping track of minimal and maximal values. Composition instead
 * of inheritance (no other `ArrayList` member is used); iterable for `RectilinearConvexHull.of`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentsCompactor.java:770
 */
export class ComponentsCompactorHullpoints implements Iterable<Point> {
  private readonly points: Point[] = [];

  topLeft: KVector = new KVector(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  bottomRight: KVector = new KVector(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

  [Symbol.iterator](): Iterator<Point> {
    return this.points[Symbol.iterator]();
  }

  /**
   * The three Java overloads `add(Point)`, `add(KVector)` and `add(ElkRectangle)` dispatch on the static
   * argument type; here on the runtime class (the three classes are unrelated).
   */
  add(e: Point | KVector | ElkRectangle): boolean {
    if (e instanceof Point) {
      return this.addPoint(e);
    } else if (e instanceof ElkRectangle) {
      return this.addRectangle(e);
    }
    return this.addPoint(Point.from(e));
  }

  private addPoint(e: Point): boolean {
    this.topLeft.x = Math.min(this.topLeft.x, e.x);
    this.topLeft.y = Math.min(this.topLeft.y, e.y);
    this.bottomRight.x = Math.max(this.bottomRight.x, e.x);
    this.bottomRight.y = Math.max(this.bottomRight.y, e.y);
    this.points.push(e);
    return true;
  }

  private addRectangle(rect: ElkRectangle): boolean {
    let returnVal = true;
    returnVal = this.add(rect.getPosition()) && returnVal;
    returnVal = this.add(rect.getPosition().add(rect.width, 0)) && returnVal;
    returnVal = this.add(rect.getPosition().add(0, rect.height)) && returnVal;
    returnVal = this.add(rect.getPosition().add(rect.width, rect.height)) && returnVal;
    return returnVal;
  }
}
