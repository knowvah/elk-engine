// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * Enumeration of available force models to use in the strategy pattern.
 *
 * @see org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force/options/ForceModelStrategy.java
 */
export class ForceModelStrategy {
  /** the Eades model. */
  static readonly EADES: ForceModelStrategy = new ForceModelStrategy('EADES', 0);
  /** the Fruchterman / Reingold model. */
  static readonly FRUCHTERMAN_REINGOLD: ForceModelStrategy = new ForceModelStrategy('FRUCHTERMAN_REINGOLD', 1);

  static readonly #VALUES: readonly ForceModelStrategy[] = [
    ForceModelStrategy.EADES,
    ForceModelStrategy.FRUCHTERMAN_REINGOLD,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly ForceModelStrategy[] {
    return ForceModelStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): ForceModelStrategy {
    const found = ForceModelStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.force.options.ForceModelStrategy.${name}`,
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

  compareTo(other: ForceModelStrategy): number {
    return this.#ordinal - other.#ordinal;
  }
}
