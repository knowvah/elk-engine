// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../../../core/math/KVector.js';
import { KVectorChain } from '../../../../../core/math/KVectorChain.js';
import { NoSuchElementException } from '../../../../../java/util/NoSuchElementException.js';
import type { SelfLoopEdge } from '../SelfLoopEdge.js';
import { OrthogonalSelfLoopRouter, type EdgeRoutingDirection } from './OrthogonalSelfLoopRouter.js';

/** Distance by which corner bend points are offset to cut their corner. */
const CORNER_DISTANCE = 10;

/** Tolerance for double comparisons. */
const TOLERANCE = 0.01;

/**
 * Routes self loops with polylines. This is basically the same routing as computed by the
 * {@link OrthogonalSelfLoopRouter}, but with the corners cut a little.
 *
 * Deviations: the Java `assert` statements (`:64`, `:82`) are omitted, and with them the private `areOrthogonallyRouted` (`:112`) that only they call. `KVectorChain` is a `LinkedList`; the iterator
 * loop of `cutCorners` reads its elements through `iterator()`, exactly as the Java does.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/routing/PolylineSelfLoopRouter.java
 */
export class PolylineSelfLoopRouter extends OrthogonalSelfLoopRouter {
  /** Turns a vector chain of orthogonal bend points into polyline bend points by cutting the corners. */
  protected override modifyBendPoints(
    slEdge: SelfLoopEdge,
    _routingDirection: EdgeRoutingDirection,
    bendPoints: KVectorChain,
  ): KVectorChain {
    // Add the source and target points
    const lSourcePort = slEdge.getSLSource().getLPort();
    bendPoints.addAt(0, lSourcePort.getPosition().clone().add(lSourcePort.getAnchor()));

    const lTargetPort = slEdge.getSLTarget().getLPort();
    bendPoints.add(lTargetPort.getPosition().clone().add(lTargetPort.getAnchor()));

    return this.cutCorners(bendPoints, CORNER_DISTANCE);
  }

  /**
   * Turns the given list of bend points into a new list of bend points by cutting the corners. The first and last bend
   * point always remain untouched (and are not included in the returned list of bend points anyway). The other bend
   * points are replaced by two each which are ideally the given distance away from the original bend point.
   *
   * This method is public for it to be accessible by our unit tests.
   */
  cutCorners(bendPoints: KVectorChain, distance: number): KVectorChain {
    const result = new KVectorChain();

    // We always look at three bend points at a time, where the one in the middle is the corner we want to cut (this
    // could be improved if KVectorChain wasn't a LinkedList and thus had faster direct access to elements)
    const bpIterator = bendPoints.iterator();
    let previous: KVector;
    let corner = this.nextOf(bpIterator);
    let next = this.nextOf(bpIterator);

    for (let step = bpIterator.next(); step.done !== true; step = bpIterator.next()) {
      // Move to the next corner
      previous = corner;
      corner = next;
      next = step.value;

      // Compute the new bend points step by step. Start by finding out how much we need to offset the corner to
      // get to the previous and next bend points. Then, limit how far we travel along that vector. Through all of
      // this, remember that the offsets always have one coordinate at 0.
      const offset1 = this.nearZeroToZero(previous.clone().sub(corner));
      const offset2 = this.nearZeroToZero(next.clone().sub(corner));

      // We usually use the standard distance, but that might be too much
      let effectiveDistance = distance;
      effectiveDistance = Math.min(effectiveDistance, Math.abs(offset1.x + offset1.y) / 2);
      effectiveDistance = Math.min(effectiveDistance, Math.abs(offset2.x + offset2.y) / 2);

      // Limit the offset vectors to our effective distance, either in the positive or negative direction
      offset1.x = Math.sign(offset1.x) * effectiveDistance;
      offset1.y = Math.sign(offset1.y) * effectiveDistance;
      offset2.x = Math.sign(offset2.x) * effectiveDistance;
      offset2.y = Math.sign(offset2.y) * effectiveDistance;

      // Compute the effective bend points and add them to our result
      result.add(offset1.add(corner));
      result.add(offset2.add(corner));
    }

    return result;
  }

  /** Java `Iterator.next()`: past the end it throws `NoSuchElementException`. */
  private nextOf(iterator: Iterator<KVector>): KVector {
    const step = iterator.next();
    if (step.done === true) {
      throw new NoSuchElementException();
    }
    return step.value;
  }

  /** Sets coordinates close to zero to exactly zero. */
  private nearZeroToZero(vector: KVector): KVector {
    if (vector.x >= -TOLERANCE && vector.x <= TOLERANCE) {
      vector.x = 0;
    }

    if (vector.y >= -TOLERANCE && vector.y <= TOLERANCE) {
      vector.y = 0;
    }

    return vector;
  }
}
