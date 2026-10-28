// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/SelfLoopDistributionStrategy.java
 */
export class SelfLoopDistributionStrategy {
  static readonly EQUALLY: SelfLoopDistributionStrategy = new SelfLoopDistributionStrategy('EQUALLY', 0);
  static readonly NORTH: SelfLoopDistributionStrategy = new SelfLoopDistributionStrategy('NORTH', 1);
  static readonly NORTH_SOUTH: SelfLoopDistributionStrategy = new SelfLoopDistributionStrategy('NORTH_SOUTH', 2);

  static readonly #VALUES: readonly SelfLoopDistributionStrategy[] = [
    SelfLoopDistributionStrategy.EQUALLY,
    SelfLoopDistributionStrategy.NORTH,
    SelfLoopDistributionStrategy.NORTH_SOUTH,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly SelfLoopDistributionStrategy[] {
    return SelfLoopDistributionStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): SelfLoopDistributionStrategy {
    const found = SelfLoopDistributionStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.SelfLoopDistributionStrategy.${name}`,
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

  compareTo(other: SelfLoopDistributionStrategy): number {
    return this.#ordinal - other.#ordinal;
  }
}
