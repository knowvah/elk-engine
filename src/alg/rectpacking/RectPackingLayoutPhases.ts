// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * This algorithm's layout phases. each phase has its own strategy factory.
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/RectPackingLayoutPhases.java
 */
export class RectPackingLayoutPhases {
  /** Phase 1. */
  static readonly P1_WIDTH_APPROXIMATION: RectPackingLayoutPhases = new RectPackingLayoutPhases(
    'P1_WIDTH_APPROXIMATION',
    0,
  );
  /** Phase 2. */
  static readonly P2_PACKING: RectPackingLayoutPhases = new RectPackingLayoutPhases('P2_PACKING', 1);
  /** Phase 3. */
  static readonly P3_WHITESPACE_ELIMINATION: RectPackingLayoutPhases = new RectPackingLayoutPhases(
    'P3_WHITESPACE_ELIMINATION',
    2,
  );

  static readonly #VALUES: readonly RectPackingLayoutPhases[] = [
    RectPackingLayoutPhases.P1_WIDTH_APPROXIMATION,
    RectPackingLayoutPhases.P2_PACKING,
    RectPackingLayoutPhases.P3_WHITESPACE_ELIMINATION,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly RectPackingLayoutPhases[] {
    return RectPackingLayoutPhases.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): RectPackingLayoutPhases {
    const found = RectPackingLayoutPhases.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.rectpacking.RectPackingLayoutPhases.${name}`,
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

  compareTo(other: RectPackingLayoutPhases): number {
    return this.#ordinal - other.#ordinal;
  }
}
