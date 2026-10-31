// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * The corner type. Java's nested `HyperedgeCrossingsCounter.HyperedgeCorner.Type` (M15 file naming).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/counting/HyperedgeCrossingsCounter.java:114
 */
export class HyperedgeCrossingsCounterHyperedgeCornerType {
  static readonly UPPER: HyperedgeCrossingsCounterHyperedgeCornerType =
    new HyperedgeCrossingsCounterHyperedgeCornerType('UPPER', 0);
  static readonly LOWER: HyperedgeCrossingsCounterHyperedgeCornerType =
    new HyperedgeCrossingsCounterHyperedgeCornerType('LOWER', 1);

  static readonly #VALUES: readonly HyperedgeCrossingsCounterHyperedgeCornerType[] = [
    HyperedgeCrossingsCounterHyperedgeCornerType.UPPER,
    HyperedgeCrossingsCounterHyperedgeCornerType.LOWER,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly HyperedgeCrossingsCounterHyperedgeCornerType[] {
    return HyperedgeCrossingsCounterHyperedgeCornerType.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): HyperedgeCrossingsCounterHyperedgeCornerType {
    const found = HyperedgeCrossingsCounterHyperedgeCornerType.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.p3order.counting.HyperedgeCrossingsCounter.HyperedgeCorner.Type.${name}`,
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
}
