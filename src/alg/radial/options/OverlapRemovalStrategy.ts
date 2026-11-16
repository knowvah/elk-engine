// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { IOverlapRemoval } from '../intermediate/overlaps/IOverlapRemoval.js';
import { RadiusExtensionOverlapRemoval } from '../intermediate/overlaps/RadiusExtensionOverlapRemoval.js';

/**
 * The list of strategies for removing overlaps in the graph.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/options/OverlapRemovalStrategy.java
 */
export class OverlapRemovalStrategy {
  /** Extend the radii until overlap are removed. */
  static readonly EXTENT_RADII: OverlapRemovalStrategy = new OverlapRemovalStrategy('EXTENT_RADII', 0);

  static readonly #VALUES: readonly OverlapRemovalStrategy[] = [OverlapRemovalStrategy.EXTENT_RADII];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly OverlapRemovalStrategy[] {
    return OverlapRemovalStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): OverlapRemovalStrategy {
    const found = OverlapRemovalStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.radial.options.OverlapRemovalStrategy.${name}`,
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

  compareTo(other: OverlapRemovalStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Instantiates the chosen strategy. */
  create(): IOverlapRemoval {
    switch (this) {
      case OverlapRemovalStrategy.EXTENT_RADII:
        return new RadiusExtensionOverlapRemoval();
      default:
        throw new IllegalArgumentException(`No implementation is available for the layout option ${this.toString()}`);
    }
  }
}
