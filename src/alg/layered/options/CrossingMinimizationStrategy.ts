// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../../core/alg/ILayoutPhaseFactory.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { LayeredPhases } from '../LayeredPhases.js';
import type { LGraph } from '../graph/LGraph.js';
import { InteractiveCrossingMinimizer } from '../p3order/InteractiveCrossingMinimizer.js';
import { LayerSweepCrossingMinimizer } from '../p3order/LayerSweepCrossingMinimizer.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from '../p3order/LayerSweepCrossingMinimizerCrossMinType.js';
import { NoCrossingMinimizer } from '../p3order/NoCrossingMinimizer.js';

/**
 * Enumeration of and factory for the different available crossing minimization strategies.
 *
 * @author msp
 * @author cds
 *
 * `@AdvancedPropertyValue`: `INTERACTIVE`. `LAYER_SWEEP` and `MEDIAN_LAYER_SWEEP` construct
 * `LayerSweepCrossingMinimizer` with `CrossMinType.BARYCENTER` and `CrossMinType.MEDIAN` in Java.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/CrossingMinimizationStrategy.java
 */
export class CrossingMinimizationStrategy implements ILayoutPhaseFactory<LayeredPhases, LGraph> {
  /** This heuristic sweeps through the layers, trying to minimize the crossings locally. When
   * `LayeredOptions.HIERARCHY_HANDLING` is set to `HierarchyHandling.INCLUDE_CHILDREN`, it sweeps into hierarchical
   * graphs during the sweep. This uses the Barycenter heuristic, in constrast to MEDIAN_LAYER_SWEEP */
  static readonly LAYER_SWEEP: CrossingMinimizationStrategy = new CrossingMinimizationStrategy('LAYER_SWEEP', 0);
  /** This heuristic uses medians of node weights to calculate the correct ordering. In all other aspects,
   * it behaves like LAYER_SWEEP. */
  static readonly MEDIAN_LAYER_SWEEP: CrossingMinimizationStrategy = new CrossingMinimizationStrategy(
    'MEDIAN_LAYER_SWEEP',
    1,
  );
  /** Allow user interaction by considering the previous node positioning. The actual positions as given in the
   * input diagram are considered here. This means that if the user moves a node, that movement is reflected in the
   * ordering of nodes. */
  static readonly INTERACTIVE: CrossingMinimizationStrategy = new CrossingMinimizationStrategy('INTERACTIVE', 2);
  /** Allows to do no crossing minimization. This requires to also set `GreedySwitchType` to off. */
  static readonly NONE: CrossingMinimizationStrategy = new CrossingMinimizationStrategy('NONE', 3);

  static readonly #VALUES: readonly CrossingMinimizationStrategy[] = [
    CrossingMinimizationStrategy.LAYER_SWEEP,
    CrossingMinimizationStrategy.MEDIAN_LAYER_SWEEP,
    CrossingMinimizationStrategy.INTERACTIVE,
    CrossingMinimizationStrategy.NONE,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly CrossingMinimizationStrategy[] {
    return CrossingMinimizationStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): CrossingMinimizationStrategy {
    const found = CrossingMinimizationStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.CrossingMinimizationStrategy.${name}`,
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

  compareTo(other: CrossingMinimizationStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /**
   * Creates the phase implementation.
   *
   * @see CrossingMinimizationStrategy.java:65
   */
  create(): ILayoutPhase<LayeredPhases, LGraph> {
    switch (this) {
      case CrossingMinimizationStrategy.LAYER_SWEEP:
        return new LayerSweepCrossingMinimizer(CrossMinType.BARYCENTER);
      case CrossingMinimizationStrategy.MEDIAN_LAYER_SWEEP:
        return new LayerSweepCrossingMinimizer(CrossMinType.MEDIAN);
      case CrossingMinimizationStrategy.INTERACTIVE:
        return new InteractiveCrossingMinimizer();
      case CrossingMinimizationStrategy.NONE:
        return new NoCrossingMinimizer();
      default:
        throw new IllegalArgumentException(
          `No implementation is available for the crossing minimizer ${this.toString()}`,
        );
    }
  }
}
