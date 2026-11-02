// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * Vertical direction enumeration. Java's nested `BKAlignedLayout.VDirection` (M15 file naming).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk/BKAlignedLayout.java:343
 */
export class BKAlignedLayoutVDirection {
  /** Iteration direction top-down. */
  static readonly DOWN: BKAlignedLayoutVDirection = new BKAlignedLayoutVDirection('DOWN', 0);
  /** Iteration direction bottom-up. */
  static readonly UP: BKAlignedLayoutVDirection = new BKAlignedLayoutVDirection('UP', 1);

  static readonly #VALUES: readonly BKAlignedLayoutVDirection[] = [
    BKAlignedLayoutVDirection.DOWN,
    BKAlignedLayoutVDirection.UP,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly BKAlignedLayoutVDirection[] {
    return BKAlignedLayoutVDirection.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): BKAlignedLayoutVDirection {
    const found = BKAlignedLayoutVDirection.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.p4nodes.bk.BKAlignedLayout.VDirection.${name}`,
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
