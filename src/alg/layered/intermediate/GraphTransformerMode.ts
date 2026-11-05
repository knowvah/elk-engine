// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * Definition of transformation modes. Java's nested `GraphTransformer.Mode` (M15 file naming).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:52
 */
export class Mode {
  /** the input graph's direction to internal direction (left-to-right). */
  static readonly TO_INTERNAL_LTR: Mode = new Mode('TO_INTERNAL_LTR', 0);
  /** internal direction back to input graph's direction. */
  static readonly TO_INPUT_DIRECTION: Mode = new Mode('TO_INPUT_DIRECTION', 1);

  static readonly #VALUES: readonly Mode[] = [Mode.TO_INTERNAL_LTR, Mode.TO_INPUT_DIRECTION];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly Mode[] {
    return Mode.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): Mode {
    const found = Mode.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.intermediate.GraphTransformer.Mode.${name}`,
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

  compareTo(other: Mode): number {
    return this.#ordinal - other.#ordinal;
  }
}
