// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/LayerConstraint.java
 */
export class LayerConstraint {
  static readonly NONE: LayerConstraint = new LayerConstraint('NONE', 0);
  static readonly FIRST: LayerConstraint = new LayerConstraint('FIRST', 1);
  static readonly FIRST_SEPARATE: LayerConstraint = new LayerConstraint('FIRST_SEPARATE', 2);
  static readonly LAST: LayerConstraint = new LayerConstraint('LAST', 3);
  static readonly LAST_SEPARATE: LayerConstraint = new LayerConstraint('LAST_SEPARATE', 4);

  static readonly #VALUES: readonly LayerConstraint[] = [
    LayerConstraint.NONE,
    LayerConstraint.FIRST,
    LayerConstraint.FIRST_SEPARATE,
    LayerConstraint.LAST,
    LayerConstraint.LAST_SEPARATE,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly LayerConstraint[] {
    return LayerConstraint.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): LayerConstraint {
    const found = LayerConstraint.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.LayerConstraint.${name}`,
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

  compareTo(other: LayerConstraint): number {
    return this.#ordinal - other.#ordinal;
  }
}
