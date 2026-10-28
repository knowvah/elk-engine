// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/ConstraintCalculationStrategy.java
 */
export class ConstraintCalculationStrategy {
  static readonly QUADRATIC: ConstraintCalculationStrategy = new ConstraintCalculationStrategy('QUADRATIC', 0);
  static readonly SCANLINE: ConstraintCalculationStrategy = new ConstraintCalculationStrategy('SCANLINE', 1);

  static readonly #VALUES: readonly ConstraintCalculationStrategy[] = [
    ConstraintCalculationStrategy.QUADRATIC,
    ConstraintCalculationStrategy.SCANLINE,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly ConstraintCalculationStrategy[] {
    return ConstraintCalculationStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): ConstraintCalculationStrategy {
    const found = ConstraintCalculationStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.ConstraintCalculationStrategy.${name}`,
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

  compareTo(other: ConstraintCalculationStrategy): number {
    return this.#ordinal - other.#ordinal;
  }
}
