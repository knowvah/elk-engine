// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { CrossingMinimizationPosition } from '../intermediate/optimization/CrossingMinimizationPosition.js';
import { EdgeLengthOptimization } from '../intermediate/optimization/EdgeLengthOptimization.js';
import { EdgeLengthPositionOptimization } from '../intermediate/optimization/EdgeLengthPositionOptimization.js';
import type { IEvaluation } from '../intermediate/optimization/IEvaluation.js';

/**
 * A list of the possible optimization strategies.
 *
 * `@AdvancedPropertyValue`: `EDGE_LENGTH_BY_POSITION`.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/options/RadialTranslationStrategy.java
 */
export class RadialTranslationStrategy {
  /** Do nothing. */
  static readonly NONE: RadialTranslationStrategy = new RadialTranslationStrategy('NONE', 0);
  /** Optimize the edge length. */
  static readonly EDGE_LENGTH: RadialTranslationStrategy = new RadialTranslationStrategy('EDGE_LENGTH', 1);
  /** Optimize the edge length by the position specified in CoreOptions.POSITION. */
  static readonly EDGE_LENGTH_BY_POSITION: RadialTranslationStrategy = new RadialTranslationStrategy(
    'EDGE_LENGTH_BY_POSITION',
    2,
  );
  /** Optimize the number of crossing in the graph. */
  static readonly CROSSING_MINIMIZATION_BY_POSITION: RadialTranslationStrategy = new RadialTranslationStrategy(
    'CROSSING_MINIMIZATION_BY_POSITION',
    3,
  );

  static readonly #VALUES: readonly RadialTranslationStrategy[] = [
    RadialTranslationStrategy.NONE,
    RadialTranslationStrategy.EDGE_LENGTH,
    RadialTranslationStrategy.EDGE_LENGTH_BY_POSITION,
    RadialTranslationStrategy.CROSSING_MINIMIZATION_BY_POSITION,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly RadialTranslationStrategy[] {
    return RadialTranslationStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): RadialTranslationStrategy {
    const found = RadialTranslationStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.radial.options.RadialTranslationStrategy.${name}`,
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

  compareTo(other: RadialTranslationStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Instantiates the chosen strategy. */
  create(): IEvaluation | null {
    switch (this) {
      case RadialTranslationStrategy.EDGE_LENGTH:
        return new EdgeLengthOptimization();
      case RadialTranslationStrategy.EDGE_LENGTH_BY_POSITION:
        return new EdgeLengthPositionOptimization();
      case RadialTranslationStrategy.CROSSING_MINIMIZATION_BY_POSITION:
        return new CrossingMinimizationPosition();
      case RadialTranslationStrategy.NONE:
        return null;
      default:
        throw new IllegalArgumentException(`No implementation is available for the layout option ${this.toString()}`);
    }
  }
}
