// SPDX-License-Identifier: EPL-2.0
import type { ILayoutPhase } from '../../../core/alg/ILayoutPhase.js';
import type { ILayoutPhaseFactory } from '../../../core/alg/ILayoutPhaseFactory.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { RectPackingLayoutPhases } from '../RectPackingLayoutPhases.js';
import { GreedyWidthApproximator } from './GreedyWidthApproximator.js';
import { TargetWidthWidthApproximator } from './TargetWidthWidthApproximator.js';

/**
 * Strategy factory to determine a target width to transform the rectangle placement problem into a strip-packing
 * problem. Each strategy needs to set the target width property to a sensible value.
 *
 * @see org.eclipse.elk.alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/p1widthapproximation/WidthApproximationStrategy.java
 */
export class WidthApproximationStrategy implements ILayoutPhaseFactory<RectPackingLayoutPhases, ElkNode> {
  static readonly GREEDY: WidthApproximationStrategy = new WidthApproximationStrategy('GREEDY', 0);
  static readonly TARGET_WIDTH: WidthApproximationStrategy = new WidthApproximationStrategy('TARGET_WIDTH', 1);

  static readonly #VALUES: readonly WidthApproximationStrategy[] = [
    WidthApproximationStrategy.GREEDY,
    WidthApproximationStrategy.TARGET_WIDTH,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly WidthApproximationStrategy[] {
    return WidthApproximationStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): WidthApproximationStrategy {
    const found = WidthApproximationStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.rectpacking.p1widthapproximation.WidthApproximationStrategy.${name}`,
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

  compareTo(other: WidthApproximationStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Creates the phase implementation. */
  create(): ILayoutPhase<RectPackingLayoutPhases, ElkNode> {
    switch (this) {
      case WidthApproximationStrategy.GREEDY:
        return new GreedyWidthApproximator();
      case WidthApproximationStrategy.TARGET_WIDTH:
        return new TargetWidthWidthApproximator();
      default:
        throw new IllegalArgumentException(
          `No implementation is available for the width approximator ${this.toString()}`,
        );
    }
  }
}
