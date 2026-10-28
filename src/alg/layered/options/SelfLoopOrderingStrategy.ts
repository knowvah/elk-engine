// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/SelfLoopOrderingStrategy.java
 */
export class SelfLoopOrderingStrategy {
  static readonly STACKED: SelfLoopOrderingStrategy = new SelfLoopOrderingStrategy('STACKED', 0);
  static readonly REVERSE_STACKED: SelfLoopOrderingStrategy = new SelfLoopOrderingStrategy('REVERSE_STACKED', 1);
  static readonly SEQUENCED: SelfLoopOrderingStrategy = new SelfLoopOrderingStrategy('SEQUENCED', 2);

  static readonly #VALUES: readonly SelfLoopOrderingStrategy[] = [
    SelfLoopOrderingStrategy.STACKED,
    SelfLoopOrderingStrategy.REVERSE_STACKED,
    SelfLoopOrderingStrategy.SEQUENCED,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly SelfLoopOrderingStrategy[] {
    return SelfLoopOrderingStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): SelfLoopOrderingStrategy {
    const found = SelfLoopOrderingStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.SelfLoopOrderingStrategy.${name}`,
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

  compareTo(other: SelfLoopOrderingStrategy): number {
    return this.#ordinal - other.#ordinal;
  }
}
