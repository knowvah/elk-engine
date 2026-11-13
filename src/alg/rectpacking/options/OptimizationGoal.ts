// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * Specifies the strategy employed to pack rectangles sequentially during {@link AreaApproximation}.
 *
 * @see org.eclipse.elk.alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/options/OptimizationGoal.java
 */
export class OptimizationGoal {
  /** Aspect ratio-driven packing heuristic. */
  static readonly ASPECT_RATIO_DRIVEN: OptimizationGoal = new OptimizationGoal('ASPECT_RATIO_DRIVEN', 0);
  /** Max scale-driven packing heuristic. */
  static readonly MAX_SCALE_DRIVEN: OptimizationGoal = new OptimizationGoal('MAX_SCALE_DRIVEN', 1);
  /** Area driven packing heuristic. */
  static readonly AREA_DRIVEN: OptimizationGoal = new OptimizationGoal('AREA_DRIVEN', 2);

  static readonly #VALUES: readonly OptimizationGoal[] = [
    OptimizationGoal.ASPECT_RATIO_DRIVEN,
    OptimizationGoal.MAX_SCALE_DRIVEN,
    OptimizationGoal.AREA_DRIVEN,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly OptimizationGoal[] {
    return OptimizationGoal.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): OptimizationGoal {
    const found = OptimizationGoal.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.rectpacking.options.OptimizationGoal.${name}`,
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

  compareTo(other: OptimizationGoal): number {
    return this.#ordinal - other.#ordinal;
  }
}
