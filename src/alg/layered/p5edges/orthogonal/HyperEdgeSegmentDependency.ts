// SPDX-License-Identifier: EPL-2.0
import type { HyperEdgeSegment } from './HyperEdgeSegment.js';
import { HyperEdgeSegmentDependencyDependencyType as DependencyType } from './HyperEdgeSegmentDependencyDependencyType.js';

/**
 * A dependency between two {@link HyperEdgeSegment}s. The dependency is to be interpreted like this: the source segment
 * wants to be in lower routing slot than the target segment. Otherwise, bad things might ensue. What this means depends
 * on the dependency's type:
 *
 * - For {@link DependencyType.REGULAR} dependencies, ignoring it will cause the result to deteriorate by the
 *   dependency's weight (which is, for example, the number of additional edge crossings caused by not honoring this
 *   dependency).
 * - For {@link DependencyType.CRITICAL} dependencies, ignoring it will cause edge overlaps, which should be avoided at
 *   all cost.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/orthogonal/HyperEdgeSegmentDependency.java
 */
export class HyperEdgeSegmentDependency {
  /** non-zero weight used for critical dependencies. */
  static readonly CRITICAL_DEPENDENCY_WEIGHT: number = 1;

  /** the dependency's type. */
  private readonly type: DependencyType;
  /** the source hypernode of this dependency. */
  private source: HyperEdgeSegment | null = null;
  /** the target hypernode of this dependency. */
  private target: HyperEdgeSegment | null = null;
  /** the weight of this dependency. */
  private readonly weight: number;

  /**
   * Creates a dependency of the given type from the given source to the given target and adds it to the dependency
   * lists of those segments.
   *
   * @see HyperEdgeSegmentDependency.java:64
   */
  private constructor(type: DependencyType, source: HyperEdgeSegment, target: HyperEdgeSegment, weight: number) {
    this.type = type;
    this.weight = weight;

    this.setSource(source);
    this.setTarget(target);
  }

  /**
   * Creates a regular dependency between the given segments with the given weight, and adds it to the segments' list
   * of incident dependencies.
   *
   * @see HyperEdgeSegmentDependency.java:78
   */
  static createAndAddRegular(
    source: HyperEdgeSegment,
    target: HyperEdgeSegment,
    weight: number,
  ): HyperEdgeSegmentDependency {
    return new HyperEdgeSegmentDependency(DependencyType.REGULAR, source, target, weight);
  }

  /**
   * Creates a critical dependency between the given segments with a weight of {@link CRITICAL_DEPENDENCY_WEIGHT}, and
   * adds it to the segments' list of incident dependencies.
   *
   * @see HyperEdgeSegmentDependency.java:88
   */
  static createAndAddCritical(source: HyperEdgeSegment, target: HyperEdgeSegment): HyperEdgeSegmentDependency {
    return new HyperEdgeSegmentDependency(
      DependencyType.CRITICAL,
      source,
      target,
      HyperEdgeSegmentDependency.CRITICAL_DEPENDENCY_WEIGHT,
    );
  }

  /**
   * Removes this dependency.
   *
   * @see HyperEdgeSegmentDependency.java:100
   */
  remove(): void {
    this.setSource(null);
    this.setTarget(null);
  }

  /**
   * Reverses this dependency.
   *
   * @see HyperEdgeSegmentDependency.java:108
   */
  reverse(): void {
    const oldSource = this.source;
    const oldTarget = this.target;

    this.setSource(oldTarget);
    this.setTarget(oldSource);
  }

  /**
   * Returns the dependency's type.
   *
   * @see HyperEdgeSegmentDependency.java:122
   */
  getType(): DependencyType {
    return this.type;
  }

  /**
   * Return the source segment.
   *
   * @see HyperEdgeSegmentDependency.java:129
   */
  getSource(): HyperEdgeSegment | null {
    return this.source;
  }

  /**
   * Sets the source segment, but does not modify that segment's list of outgoing dependencies.
   *
   * @see HyperEdgeSegmentDependency.java:136
   */
  setSource(newSource: HyperEdgeSegment | null): void {
    if (this.source !== null) {
      removeFirstOccurrence(this.source.getOutgoingSegmentDependencies(), this);
    }

    this.source = newSource;

    if (this.source !== null) {
      this.source.getOutgoingSegmentDependencies().push(this);
    }
  }

  /**
   * Return the target segment.
   *
   * @see HyperEdgeSegmentDependency.java:151
   */
  getTarget(): HyperEdgeSegment | null {
    return this.target;
  }

  /**
   * Sets the target segment, but does not modify that segment's list of incoming dependencies.
   *
   * @see HyperEdgeSegmentDependency.java:158
   */
  setTarget(newTarget: HyperEdgeSegment | null): void {
    if (this.target !== null) {
      removeFirstOccurrence(this.target.getIncomingSegmentDependencies(), this);
    }

    this.target = newTarget;

    if (this.target !== null) {
      this.target.getIncomingSegmentDependencies().push(this);
    }
  }

  /**
   * Returns the weight of this dependency.
   *
   * @see HyperEdgeSegmentDependency.java:173
   */
  getWeight(): number {
    return this.weight;
  }

  toString(): string {
    return `${String(this.source)}->${String(this.target)} (${this.type.name()})`;
  }
}

/**
 * `ArrayList.remove(Object)`: removes the first element equal to `element` (dependencies do not override `equals`, so
 * equality is identity).
 */
function removeFirstOccurrence<T>(list: T[], element: T): void {
  const index = list.indexOf(element);
  if (index >= 0) {
    list.splice(index, 1);
  }
}
