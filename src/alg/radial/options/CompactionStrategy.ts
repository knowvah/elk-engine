// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { AnnulusWedgeCompaction } from '../intermediate/compaction/AnnulusWedgeCompaction.js';
import type { IRadialCompactor } from '../intermediate/compaction/IRadialCompactor.js';
import { RadialCompaction } from '../intermediate/compaction/RadialCompaction.js';

/**
 * The list of selectable compaction algorithms.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/options/CompactionStrategy.java
 */
export class CompactionStrategy {
  /** No compaction. */
  static readonly NONE: CompactionStrategy = new CompactionStrategy('NONE', 0);
  /** Contract each radius. */
  static readonly RADIAL_COMPACTION: CompactionStrategy = new CompactionStrategy('RADIAL_COMPACTION', 1);
  /** Contract each wedge. */
  static readonly WEDGE_COMPACTION: CompactionStrategy = new CompactionStrategy('WEDGE_COMPACTION', 2);

  static readonly #VALUES: readonly CompactionStrategy[] = [
    CompactionStrategy.NONE,
    CompactionStrategy.RADIAL_COMPACTION,
    CompactionStrategy.WEDGE_COMPACTION,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly CompactionStrategy[] {
    return CompactionStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): CompactionStrategy {
    const found = CompactionStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.radial.options.CompactionStrategy.${name}`,
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

  compareTo(other: CompactionStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Instantiates the chosen strategy. */
  create(): IRadialCompactor {
    switch (this) {
      case CompactionStrategy.RADIAL_COMPACTION:
        return new RadialCompaction();
      case CompactionStrategy.WEDGE_COMPACTION:
        return new AnnulusWedgeCompaction();
      default:
        throw new IllegalArgumentException(`No implementation is available for the layout option ${this.toString()}`);
    }
  }
}
