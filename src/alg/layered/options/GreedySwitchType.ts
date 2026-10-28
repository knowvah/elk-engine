// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/GreedySwitchType.java
 */
export class GreedySwitchType {
  static readonly ONE_SIDED: GreedySwitchType = new GreedySwitchType('ONE_SIDED', 0);
  static readonly TWO_SIDED: GreedySwitchType = new GreedySwitchType('TWO_SIDED', 1);
  static readonly OFF: GreedySwitchType = new GreedySwitchType('OFF', 2);

  static readonly #VALUES: readonly GreedySwitchType[] = [
    GreedySwitchType.ONE_SIDED,
    GreedySwitchType.TWO_SIDED,
    GreedySwitchType.OFF,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly GreedySwitchType[] {
    return GreedySwitchType.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): GreedySwitchType {
    const found = GreedySwitchType.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.GreedySwitchType.${name}`,
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

  compareTo(other: GreedySwitchType): number {
    return this.#ordinal - other.#ordinal;
  }
}
