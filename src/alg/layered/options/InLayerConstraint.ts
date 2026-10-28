// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/InLayerConstraint.java
 */
export class InLayerConstraint {
  static readonly NONE: InLayerConstraint = new InLayerConstraint('NONE', 0);
  static readonly TOP: InLayerConstraint = new InLayerConstraint('TOP', 1);
  static readonly BOTTOM: InLayerConstraint = new InLayerConstraint('BOTTOM', 2);

  static readonly #VALUES: readonly InLayerConstraint[] = [
    InLayerConstraint.NONE,
    InLayerConstraint.TOP,
    InLayerConstraint.BOTTOM,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly InLayerConstraint[] {
    return InLayerConstraint.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): InLayerConstraint {
    const found = InLayerConstraint.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.InLayerConstraint.${name}`,
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

  compareTo(other: InLayerConstraint): number {
    return this.#ordinal - other.#ordinal;
  }
}
