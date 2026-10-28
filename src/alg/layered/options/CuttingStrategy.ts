// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/CuttingStrategy.java
 */
export class CuttingStrategy {
  static readonly ARD: CuttingStrategy = new CuttingStrategy('ARD', 0);
  static readonly MSD: CuttingStrategy = new CuttingStrategy('MSD', 1);
  static readonly MANUAL: CuttingStrategy = new CuttingStrategy('MANUAL', 2);

  static readonly #VALUES: readonly CuttingStrategy[] = [
    CuttingStrategy.ARD,
    CuttingStrategy.MSD,
    CuttingStrategy.MANUAL,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly CuttingStrategy[] {
    return CuttingStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): CuttingStrategy {
    const found = CuttingStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.CuttingStrategy.${name}`,
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

  compareTo(other: CuttingStrategy): number {
    return this.#ordinal - other.#ordinal;
  }
}
