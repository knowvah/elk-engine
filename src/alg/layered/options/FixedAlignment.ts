// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/FixedAlignment.java
 */
export class FixedAlignment {
  static readonly NONE: FixedAlignment = new FixedAlignment('NONE', 0);
  static readonly LEFTUP: FixedAlignment = new FixedAlignment('LEFTUP', 1);
  static readonly RIGHTUP: FixedAlignment = new FixedAlignment('RIGHTUP', 2);
  static readonly LEFTDOWN: FixedAlignment = new FixedAlignment('LEFTDOWN', 3);
  static readonly RIGHTDOWN: FixedAlignment = new FixedAlignment('RIGHTDOWN', 4);
  static readonly BALANCED: FixedAlignment = new FixedAlignment('BALANCED', 5);

  static readonly #VALUES: readonly FixedAlignment[] = [
    FixedAlignment.NONE,
    FixedAlignment.LEFTUP,
    FixedAlignment.RIGHTUP,
    FixedAlignment.LEFTDOWN,
    FixedAlignment.RIGHTDOWN,
    FixedAlignment.BALANCED,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly FixedAlignment[] {
    return FixedAlignment.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): FixedAlignment {
    const found = FixedAlignment.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.alg.layered.options.FixedAlignment.${name}`);
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

  compareTo(other: FixedAlignment): number {
    return this.#ordinal - other.#ordinal;
  }
}
