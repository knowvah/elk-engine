// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/PortSortingStrategy.java
 */
export class PortSortingStrategy {
  static readonly INPUT_ORDER: PortSortingStrategy = new PortSortingStrategy('INPUT_ORDER', 0);
  static readonly PORT_DEGREE: PortSortingStrategy = new PortSortingStrategy('PORT_DEGREE', 1);

  static readonly #VALUES: readonly PortSortingStrategy[] = [
    PortSortingStrategy.INPUT_ORDER,
    PortSortingStrategy.PORT_DEGREE,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly PortSortingStrategy[] {
    return PortSortingStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): PortSortingStrategy {
    const found = PortSortingStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.PortSortingStrategy.${name}`,
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

  compareTo(other: PortSortingStrategy): number {
    return this.#ordinal - other.#ordinal;
  }
}
