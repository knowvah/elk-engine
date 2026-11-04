// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * Possible types of dependencies between {@link HyperEdgeSegment}s. Java nested enum
 * `HyperEdgeSegmentDependency.DependencyType`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/orthogonal/HyperEdgeSegmentDependency.java:35
 */
export class HyperEdgeSegmentDependencyDependencyType {
  /** Regular dependencies are ones that, if ignored, may cause additional crossings. */
  static readonly REGULAR: HyperEdgeSegmentDependencyDependencyType = new HyperEdgeSegmentDependencyDependencyType(
    'REGULAR',
    0,
  );
  /** Critical depencies are ones that, if ignored, result in edge overlaps. */
  static readonly CRITICAL: HyperEdgeSegmentDependencyDependencyType = new HyperEdgeSegmentDependencyDependencyType(
    'CRITICAL',
    1,
  );

  static readonly #VALUES: readonly HyperEdgeSegmentDependencyDependencyType[] = [
    HyperEdgeSegmentDependencyDependencyType.REGULAR,
    HyperEdgeSegmentDependencyDependencyType.CRITICAL,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly HyperEdgeSegmentDependencyDependencyType[] {
    return HyperEdgeSegmentDependencyDependencyType.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): HyperEdgeSegmentDependencyDependencyType {
    const found = HyperEdgeSegmentDependencyDependencyType.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.p5edges.orthogonal.HyperEdgeSegmentDependency.DependencyType.${name}`,
      );
    }
    return found;
  }

  ordinal(): number {
    return this.#ordinal;
  }

  name(): string {
    return this.#name;
  }

  toString(): string {
    return this.#name;
  }

  compareTo(other: HyperEdgeSegmentDependencyDependencyType): number {
    return this.#ordinal - other.#ordinal;
  }
}
