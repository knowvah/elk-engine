// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * Horizontal direction enumeration. Java's nested `BKAlignedLayout.HDirection` (M15 file naming).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/BKAlignedLayout.java:353
 */
export class BKAlignedLayoutHDirection {
  /** Iterating from right to left. */
  static readonly RIGHT: BKAlignedLayoutHDirection = new BKAlignedLayoutHDirection('RIGHT', 0);
  /** Iterating from left to right. */
  static readonly LEFT: BKAlignedLayoutHDirection = new BKAlignedLayoutHDirection('LEFT', 1);

  static readonly #VALUES: readonly BKAlignedLayoutHDirection[] = [
    BKAlignedLayoutHDirection.RIGHT,
    BKAlignedLayoutHDirection.LEFT,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly BKAlignedLayoutHDirection[] {
    return BKAlignedLayoutHDirection.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): BKAlignedLayoutHDirection {
    const found = BKAlignedLayoutHDirection.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.p4nodes.bk.BKAlignedLayout.HDirection.${name}`,
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
}
