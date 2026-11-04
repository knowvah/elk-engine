// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * Pretty small enumeration used to define which side to process. Java's nested `SplineEdgeRouter.SideToProcess`
 * (M15 file naming).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/SplineEdgeRouter.java:1043
 */
export class SplineEdgeRouterSideToProcess {
  /** Process the left side. */
  static readonly LEFT: SplineEdgeRouterSideToProcess = new SplineEdgeRouterSideToProcess('LEFT', 0);
  /** Process the right side. */
  static readonly RIGHT: SplineEdgeRouterSideToProcess = new SplineEdgeRouterSideToProcess('RIGHT', 1);

  static readonly #VALUES: readonly SplineEdgeRouterSideToProcess[] = [
    SplineEdgeRouterSideToProcess.LEFT,
    SplineEdgeRouterSideToProcess.RIGHT,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly SplineEdgeRouterSideToProcess[] {
    return SplineEdgeRouterSideToProcess.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): SplineEdgeRouterSideToProcess {
    const found = SplineEdgeRouterSideToProcess.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.p5edges.splines.SplineEdgeRouter.SideToProcess.${name}`,
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
}
