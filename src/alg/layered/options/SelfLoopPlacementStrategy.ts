// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/SelfLoopPlacementStrategy.java
 */
export class SelfLoopPlacementStrategy {
  static readonly EQUALLY_DISTRIBUTED: SelfLoopPlacementStrategy = new SelfLoopPlacementStrategy(
    'EQUALLY_DISTRIBUTED',
    0,
  );
  static readonly NORTH_STACKED: SelfLoopPlacementStrategy = new SelfLoopPlacementStrategy('NORTH_STACKED', 1);
  static readonly NORTH_SEQUENCE: SelfLoopPlacementStrategy = new SelfLoopPlacementStrategy('NORTH_SEQUENCE', 2);

  static readonly #VALUES: readonly SelfLoopPlacementStrategy[] = [
    SelfLoopPlacementStrategy.EQUALLY_DISTRIBUTED,
    SelfLoopPlacementStrategy.NORTH_STACKED,
    SelfLoopPlacementStrategy.NORTH_SEQUENCE,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly SelfLoopPlacementStrategy[] {
    return SelfLoopPlacementStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): SelfLoopPlacementStrategy {
    const found = SelfLoopPlacementStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.SelfLoopPlacementStrategy.${name}`,
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

  compareTo(other: SelfLoopPlacementStrategy): number {
    return this.#ordinal - other.#ordinal;
  }
}
