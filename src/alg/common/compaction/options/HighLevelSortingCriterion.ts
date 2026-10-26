// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/compaction/options/HighLevelSortingCriterion.java
 */
export class HighLevelSortingCriterion {
  static readonly NUM_OF_EXTERNAL_SIDES_THAN_NUM_OF_EXTENSIONS_LAST: HighLevelSortingCriterion =
    new HighLevelSortingCriterion('NUM_OF_EXTERNAL_SIDES_THAN_NUM_OF_EXTENSIONS_LAST', 0);
  static readonly CORNER_CASES_THAN_SINGLE_SIDE_LAST: HighLevelSortingCriterion = new HighLevelSortingCriterion(
    'CORNER_CASES_THAN_SINGLE_SIDE_LAST',
    1,
  );

  static readonly #VALUES: readonly HighLevelSortingCriterion[] = [
    HighLevelSortingCriterion.NUM_OF_EXTERNAL_SIDES_THAN_NUM_OF_EXTENSIONS_LAST,
    HighLevelSortingCriterion.CORNER_CASES_THAN_SINGLE_SIDE_LAST,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly HighLevelSortingCriterion[] {
    return HighLevelSortingCriterion.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): HighLevelSortingCriterion {
    const found = HighLevelSortingCriterion.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.common.compaction.options.HighLevelSortingCriterion.${name}`,
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

  compareTo(other: HighLevelSortingCriterion): number {
    return this.#ordinal - other.#ordinal;
  }
}
