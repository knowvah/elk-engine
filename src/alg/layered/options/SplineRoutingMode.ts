// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/SplineRoutingMode.java
 */
export class SplineRoutingMode {
  static readonly CONSERVATIVE: SplineRoutingMode = new SplineRoutingMode('CONSERVATIVE', 0);
  static readonly CONSERVATIVE_SOFT: SplineRoutingMode = new SplineRoutingMode('CONSERVATIVE_SOFT', 1);
  static readonly SLOPPY: SplineRoutingMode = new SplineRoutingMode('SLOPPY', 2);

  static readonly #VALUES: readonly SplineRoutingMode[] = [
    SplineRoutingMode.CONSERVATIVE,
    SplineRoutingMode.CONSERVATIVE_SOFT,
    SplineRoutingMode.SLOPPY,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly SplineRoutingMode[] {
    return SplineRoutingMode.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): SplineRoutingMode {
    const found = SplineRoutingMode.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.SplineRoutingMode.${name}`,
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

  compareTo(other: SplineRoutingMode): number {
    return this.#ordinal - other.#ordinal;
  }
}
