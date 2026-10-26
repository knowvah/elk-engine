// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/options/TraversalStrategy.java
 */
export class TraversalStrategy {
  static readonly SPIRAL: TraversalStrategy = new TraversalStrategy('SPIRAL', 0);
  static readonly LINE_BY_LINE: TraversalStrategy = new TraversalStrategy('LINE_BY_LINE', 1);
  static readonly MANHATTAN: TraversalStrategy = new TraversalStrategy('MANHATTAN', 2);
  static readonly JITTER: TraversalStrategy = new TraversalStrategy('JITTER', 3);
  static readonly QUADRANTS_LINE_BY_LINE: TraversalStrategy = new TraversalStrategy('QUADRANTS_LINE_BY_LINE', 4);
  static readonly QUADRANTS_MANHATTAN: TraversalStrategy = new TraversalStrategy('QUADRANTS_MANHATTAN', 5);
  static readonly QUADRANTS_JITTER: TraversalStrategy = new TraversalStrategy('QUADRANTS_JITTER', 6);
  static readonly COMBINE_LINE_BY_LINE_MANHATTAN: TraversalStrategy = new TraversalStrategy(
    'COMBINE_LINE_BY_LINE_MANHATTAN',
    7,
  );
  static readonly COMBINE_JITTER_MANHATTAN: TraversalStrategy = new TraversalStrategy('COMBINE_JITTER_MANHATTAN', 8);

  static readonly #VALUES: readonly TraversalStrategy[] = [
    TraversalStrategy.SPIRAL,
    TraversalStrategy.LINE_BY_LINE,
    TraversalStrategy.MANHATTAN,
    TraversalStrategy.JITTER,
    TraversalStrategy.QUADRANTS_LINE_BY_LINE,
    TraversalStrategy.QUADRANTS_MANHATTAN,
    TraversalStrategy.QUADRANTS_JITTER,
    TraversalStrategy.COMBINE_LINE_BY_LINE_MANHATTAN,
    TraversalStrategy.COMBINE_JITTER_MANHATTAN,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly TraversalStrategy[] {
    return TraversalStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): TraversalStrategy {
    const found = TraversalStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.common.compaction.options.TraversalStrategy.${name}`,
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

  compareTo(other: TraversalStrategy): number {
    return this.#ordinal - other.#ordinal;
  }
}
