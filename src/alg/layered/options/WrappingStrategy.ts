// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/WrappingStrategy.java
 */
export class WrappingStrategy {
  static readonly OFF: WrappingStrategy = new WrappingStrategy('OFF', 0);
  static readonly SINGLE_EDGE: WrappingStrategy = new WrappingStrategy('SINGLE_EDGE', 1);
  static readonly MULTI_EDGE: WrappingStrategy = new WrappingStrategy('MULTI_EDGE', 2);

  static readonly #VALUES: readonly WrappingStrategy[] = [
    WrappingStrategy.OFF,
    WrappingStrategy.SINGLE_EDGE,
    WrappingStrategy.MULTI_EDGE,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly WrappingStrategy[] {
    return WrappingStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): WrappingStrategy {
    const found = WrappingStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.WrappingStrategy.${name}`,
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

  compareTo(other: WrappingStrategy): number {
    return this.#ordinal - other.#ordinal;
  }
}
