// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/options/LowLevelSortingCriterion.java
 */
export class LowLevelSortingCriterion {
  static readonly BY_SIZE: LowLevelSortingCriterion = new LowLevelSortingCriterion('BY_SIZE', 0);
  static readonly BY_SIZE_AND_SHAPE: LowLevelSortingCriterion = new LowLevelSortingCriterion('BY_SIZE_AND_SHAPE', 1);

  static readonly #VALUES: readonly LowLevelSortingCriterion[] = [
    LowLevelSortingCriterion.BY_SIZE,
    LowLevelSortingCriterion.BY_SIZE_AND_SHAPE,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly LowLevelSortingCriterion[] {
    return LowLevelSortingCriterion.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): LowLevelSortingCriterion {
    const found = LowLevelSortingCriterion.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.common.compaction.options.LowLevelSortingCriterion.${name}`,
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

  compareTo(other: LowLevelSortingCriterion): number {
    return this.#ordinal - other.#ordinal;
  }
}
