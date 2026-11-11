// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IDSorter } from '../sorting/IDSorter.js';
import type { IRadialSorter } from '../sorting/IRadialSorter.js';
import { PolarCoordinateSorter } from '../sorting/PolarCoordinateSorter.js';

/**
 * The list of selectable sorting strategies.
 *
 * `@AdvancedPropertyValue`: `POLAR_COORDINATE`.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/options/SortingStrategy.java
 */
export class SortingStrategy {
  /** Do no sorting. */
  static readonly NONE: SortingStrategy = new SortingStrategy('NONE', 0);
  /** Sort by polar coordinates of parent. */
  static readonly POLAR_COORDINATE: SortingStrategy = new SortingStrategy('POLAR_COORDINATE', 1);
  /** Sort by given order id. */
  static readonly ID: SortingStrategy = new SortingStrategy('ID', 2);

  static readonly #VALUES: readonly SortingStrategy[] = [
    SortingStrategy.NONE,
    SortingStrategy.POLAR_COORDINATE,
    SortingStrategy.ID,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly SortingStrategy[] {
    return SortingStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): SortingStrategy {
    const found = SortingStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.alg.radial.options.SortingStrategy.${name}`);
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

  compareTo(other: SortingStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Instantiates the chosen strategy. */
  create(): IRadialSorter | null {
    switch (this) {
      case SortingStrategy.NONE:
        return null;
      case SortingStrategy.POLAR_COORDINATE:
        return new PolarCoordinateSorter();
      case SortingStrategy.ID:
        return new IDSorter();
      default:
        throw new IllegalArgumentException(`No implementation is available for the layout option ${this.toString()}`);
    }
  }
}
