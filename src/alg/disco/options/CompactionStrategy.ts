// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * Possible strategies for packing different connected components on a canvas in order to save space and enhance
 * readability of a graph.
 *
 * POLYOMINO - First naive implementation of Freivalds et al. (2002) realized in `PolyominoCompactor`.
 *
 * @see org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/options/CompactionStrategy.java
 */
export class CompactionStrategy {
  /** There is only one strategy implemented, yet. */
  static readonly POLYOMINO: CompactionStrategy = new CompactionStrategy('POLYOMINO', 0);

  static readonly #VALUES: readonly CompactionStrategy[] = [CompactionStrategy.POLYOMINO];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly CompactionStrategy[] {
    return CompactionStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): CompactionStrategy {
    const found = CompactionStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.disco.options.CompactionStrategy.${name}`,
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

  compareTo(other: CompactionStrategy): number {
    return this.#ordinal - other.#ordinal;
  }
}
