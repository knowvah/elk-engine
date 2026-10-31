// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * Type of crossing minimizer. Java's nested `LayerSweepCrossingMinimizer.CrossMinType` (M15 file naming).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/LayerSweepCrossingMinimizer.java:655
 */
export class LayerSweepCrossingMinimizerCrossMinType {
  /** Use BarycenterHeuristic. */
  static readonly BARYCENTER: LayerSweepCrossingMinimizerCrossMinType = new LayerSweepCrossingMinimizerCrossMinType(
    'BARYCENTER',
    0,
  );
  /** Use one-sided GreedySwitchHeuristic. */
  static readonly ONE_SIDED_GREEDY_SWITCH: LayerSweepCrossingMinimizerCrossMinType =
    new LayerSweepCrossingMinimizerCrossMinType('ONE_SIDED_GREEDY_SWITCH', 1);
  /** Use two-sided GreedySwitchHeuristic. */
  static readonly TWO_SIDED_GREEDY_SWITCH: LayerSweepCrossingMinimizerCrossMinType =
    new LayerSweepCrossingMinimizerCrossMinType('TWO_SIDED_GREEDY_SWITCH', 2);
  /** Use MedianHeuristic */
  static readonly MEDIAN: LayerSweepCrossingMinimizerCrossMinType = new LayerSweepCrossingMinimizerCrossMinType(
    'MEDIAN',
    3,
  );

  static readonly #VALUES: readonly LayerSweepCrossingMinimizerCrossMinType[] = [
    LayerSweepCrossingMinimizerCrossMinType.BARYCENTER,
    LayerSweepCrossingMinimizerCrossMinType.ONE_SIDED_GREEDY_SWITCH,
    LayerSweepCrossingMinimizerCrossMinType.TWO_SIDED_GREEDY_SWITCH,
    LayerSweepCrossingMinimizerCrossMinType.MEDIAN,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly LayerSweepCrossingMinimizerCrossMinType[] {
    return LayerSweepCrossingMinimizerCrossMinType.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): LayerSweepCrossingMinimizerCrossMinType {
    const found = LayerSweepCrossingMinimizerCrossMinType.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.p3order.LayerSweepCrossingMinimizer.CrossMinType.${name}`,
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
