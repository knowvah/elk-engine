// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/DirectionCongruency.java
 */
export class DirectionCongruency {
  static readonly READING_DIRECTION: DirectionCongruency = new DirectionCongruency('READING_DIRECTION', 0);
  static readonly ROTATION: DirectionCongruency = new DirectionCongruency('ROTATION', 1);

  static readonly #VALUES: readonly DirectionCongruency[] = [
    DirectionCongruency.READING_DIRECTION,
    DirectionCongruency.ROTATION,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly DirectionCongruency[] {
    return DirectionCongruency.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): DirectionCongruency {
    const found = DirectionCongruency.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.DirectionCongruency.${name}`,
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

  compareTo(other: DirectionCongruency): number {
    return this.#ordinal - other.#ordinal;
  }
}
