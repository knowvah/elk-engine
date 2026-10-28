// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/CenterEdgeLabelPlacementStrategy.java
 * Java annotations kept as comments: WIDEST_LAYER: @ExperimentalPropertyValue; CENTER_LAYER: @ExperimentalPropertyValue.
 */
export class CenterEdgeLabelPlacementStrategy {
  static readonly MEDIAN_LAYER: CenterEdgeLabelPlacementStrategy = new CenterEdgeLabelPlacementStrategy(
    'MEDIAN_LAYER',
    0,
  );
  static readonly TAIL_LAYER: CenterEdgeLabelPlacementStrategy = new CenterEdgeLabelPlacementStrategy('TAIL_LAYER', 1);
  static readonly HEAD_LAYER: CenterEdgeLabelPlacementStrategy = new CenterEdgeLabelPlacementStrategy('HEAD_LAYER', 2);
  static readonly SPACE_EFFICIENT_LAYER: CenterEdgeLabelPlacementStrategy = new CenterEdgeLabelPlacementStrategy(
    'SPACE_EFFICIENT_LAYER',
    3,
  );
  static readonly WIDEST_LAYER: CenterEdgeLabelPlacementStrategy = new CenterEdgeLabelPlacementStrategy(
    'WIDEST_LAYER',
    4,
  );
  static readonly CENTER_LAYER: CenterEdgeLabelPlacementStrategy = new CenterEdgeLabelPlacementStrategy(
    'CENTER_LAYER',
    5,
  );

  static readonly #VALUES: readonly CenterEdgeLabelPlacementStrategy[] = [
    CenterEdgeLabelPlacementStrategy.MEDIAN_LAYER,
    CenterEdgeLabelPlacementStrategy.TAIL_LAYER,
    CenterEdgeLabelPlacementStrategy.HEAD_LAYER,
    CenterEdgeLabelPlacementStrategy.SPACE_EFFICIENT_LAYER,
    CenterEdgeLabelPlacementStrategy.WIDEST_LAYER,
    CenterEdgeLabelPlacementStrategy.CENTER_LAYER,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly CenterEdgeLabelPlacementStrategy[] {
    return CenterEdgeLabelPlacementStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): CenterEdgeLabelPlacementStrategy {
    const found = CenterEdgeLabelPlacementStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.CenterEdgeLabelPlacementStrategy.${name}`,
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

  compareTo(other: CenterEdgeLabelPlacementStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Checks whether this strategy is based on information about the width of layers. */
  usesLabelSizeInformation(): boolean {
    return (
      this === CenterEdgeLabelPlacementStrategy.WIDEST_LAYER ||
      this === CenterEdgeLabelPlacementStrategy.CENTER_LAYER ||
      this === CenterEdgeLabelPlacementStrategy.SPACE_EFFICIENT_LAYER
    );
  }
}
