// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/LayerUnzippingStrategy.java
 */
export class LayerUnzippingStrategy {
  static readonly NONE: LayerUnzippingStrategy = new LayerUnzippingStrategy('NONE', 0);
  static readonly ALTERNATING: LayerUnzippingStrategy = new LayerUnzippingStrategy('ALTERNATING', 1);

  static readonly #VALUES: readonly LayerUnzippingStrategy[] = [
    LayerUnzippingStrategy.NONE,
    LayerUnzippingStrategy.ALTERNATING,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly LayerUnzippingStrategy[] {
    return LayerUnzippingStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): LayerUnzippingStrategy {
    const found = LayerUnzippingStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.LayerUnzippingStrategy.${name}`,
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

  compareTo(other: LayerUnzippingStrategy): number {
    return this.#ordinal - other.#ordinal;
  }
}
