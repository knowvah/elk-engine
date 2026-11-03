// SPDX-License-Identifier: EPL-2.0
import type { SplineSegment } from './SplineSegment.js';

/**
 * A dependency pointing from edge A to edge B means that edge A must lay left of edge B to minimize the number of edge
 * crossings. A dependency with the weight of 0 means that the number of edge crossings does not vary, if the position of
 * the two hyper-edges is swapped. BUT the two hyper-edges share a vertical segment, so they may not lay on the same
 * x-coordinate as this would result in an overlapping segment. Java's inner `SplineEdgeRouter.Dependency` (M15 file
 * naming).
 *
 * `source` and `target` are `private` in the Java, read and (by `breakCycles`) written by the outer class; with the
 * outer class in another file they are public here. The Java inner class captures no outer state.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/SplineEdgeRouter.java:1011
 */
export class SplineEdgeRouterDependency {
  /** The source of the dependency. (Should lay left) */
  source: SplineSegment;
  /** The target of the dependency. (Should lay right) */
  target: SplineSegment;
  /** The weight of the dependency. */
  readonly weight: number;

  /**
   * Creates a dependency from the given source to the given target.
   *
   * @param source the dependency source
   * @param target the dependency target
   * @param weight weight of the dependency
   */
  constructor(source: SplineSegment, target: SplineSegment, weight: number) {
    this.source = source;
    this.target = target;
    this.weight = weight;
    source.outgoing.push(this);
    target.incoming.push(this);
  }

  /** The segments print as `Object.toString` does in the Java (a class name and a hash); prose only. */
  toString(): string {
    return `${String(this.source)} ->(${this.weight}) ${String(this.target)}`;
  }
}
