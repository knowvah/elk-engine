// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * Describes all the different alignments a label might have. Most are alignments for labels on the northern or southern
 * side. Labels on the eastern or western side are restricted to {@link Alignment.TOP}. Java nests this enum in
 * `SelfHyperLoopLabels` (`SelfHyperLoopLabels.Alignment`); it lives in its own file here and `SelfHyperLoopLabels.ts`
 * re-exports it.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/SelfHyperLoopLabels.java#Alignment
 */
export class Alignment {
  /** A northern or southern centered label. */
  static readonly CENTER: Alignment = new Alignment('CENTER', 0);
  /** A northern or southern left-aligned label. */
  static readonly LEFT: Alignment = new Alignment('LEFT', 1);
  /** A northern or southern right-aligned label. */
  static readonly RIGHT: Alignment = new Alignment('RIGHT', 2);
  /** An eastern or western top-aligned label. */
  static readonly TOP: Alignment = new Alignment('TOP', 3);

  static readonly #VALUES: readonly Alignment[] = [Alignment.CENTER, Alignment.LEFT, Alignment.RIGHT, Alignment.TOP];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly Alignment[] {
    return Alignment.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): Alignment {
    const found = Alignment.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.intermediate.loops.SelfHyperLoopLabels.Alignment.${name}`,
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

  compareTo(other: Alignment): number {
    return this.#ordinal - other.#ordinal;
  }
}
