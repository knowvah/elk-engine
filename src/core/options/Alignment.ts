// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Enumeration of node alignment options. To be accessed using {@link CoreOptions#ALIGNMENT}.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/Alignment.java
 */
export class Alignment {
  /** automatic alignment (default). */
  static readonly AUTOMATIC: Alignment = new Alignment('AUTOMATIC', 0);
  /** left alignment. */
  static readonly LEFT: Alignment = new Alignment('LEFT', 1);
  /** right alignment. */
  static readonly RIGHT: Alignment = new Alignment('RIGHT', 2);
  /** top alignment. */
  static readonly TOP: Alignment = new Alignment('TOP', 3);
  /** bottom alignment. */
  static readonly BOTTOM: Alignment = new Alignment('BOTTOM', 4);
  /** center alignment. */
  static readonly CENTER: Alignment = new Alignment('CENTER', 5);

  static readonly #VALUES: readonly Alignment[] = [
    Alignment.AUTOMATIC,
    Alignment.LEFT,
    Alignment.RIGHT,
    Alignment.TOP,
    Alignment.BOTTOM,
    Alignment.CENTER,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly Alignment[] {
    return Alignment.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): Alignment {
    const found = Alignment.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.options.Alignment.${name}`);
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

  compareTo(other: Alignment): number {
    return this.#ordinal - other.#ordinal;
  }
}
