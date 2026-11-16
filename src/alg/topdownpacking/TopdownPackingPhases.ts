// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Topdown packing phases.
 *
 * @see org.eclipse.elk.alg.topdownpacking/src/org/eclipse/elk/alg/topdownpacking/TopdownPackingPhases.java
 */
export class TopdownPackingPhases {
  /** Arrange equally sized nodes where the size is defined by the parent. */
  static readonly P1_NODE_ARRANGEMENT: TopdownPackingPhases = new TopdownPackingPhases('P1_NODE_ARRANGEMENT', 0);

  /** Eliminate white space by increasing the size of some nodes to fully fill the space provided by the parent. */
  static readonly P2_WHITESPACE_ELIMINATION: TopdownPackingPhases = new TopdownPackingPhases(
    'P2_WHITESPACE_ELIMINATION',
    1,
  );

  static readonly #VALUES: readonly TopdownPackingPhases[] = [
    TopdownPackingPhases.P1_NODE_ARRANGEMENT,
    TopdownPackingPhases.P2_WHITESPACE_ELIMINATION,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly TopdownPackingPhases[] {
    return TopdownPackingPhases.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): TopdownPackingPhases {
    const found = TopdownPackingPhases.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.topdownpacking.TopdownPackingPhases.${name}`,
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

  compareTo(other: TopdownPackingPhases): number {
    return this.#ordinal - other.#ordinal;
  }
}
