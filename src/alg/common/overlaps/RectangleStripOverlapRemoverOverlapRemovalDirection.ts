// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * The direction in which to move rectangles in order to remove overlaps. The direction also defines whether to remove
 * horizontal or vertical overlaps. Java's public nested enum `RectangleStripOverlapRemover.OverlapRemovalDirection`,
 * split into its own file (M15).
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/overlaps/RectangleStripOverlapRemover.java
 */
export class OverlapRemovalDirection {
  /** Remove horizontal overlaps by moving rectangles upwards. */
  static readonly UP: OverlapRemovalDirection = new OverlapRemovalDirection('UP', 0);
  /** Remove horizontal overlaps by moving rectangles downwards. */
  static readonly DOWN: OverlapRemovalDirection = new OverlapRemovalDirection('DOWN', 1);
  /** Remove vertical overlaps by moving rectangles leftwards. */
  static readonly LEFT: OverlapRemovalDirection = new OverlapRemovalDirection('LEFT', 2);
  /** Remove vertical overlaps by moving rectangles rightwards. */
  static readonly RIGHT: OverlapRemovalDirection = new OverlapRemovalDirection('RIGHT', 3);

  static readonly #VALUES: readonly OverlapRemovalDirection[] = [
    OverlapRemovalDirection.UP,
    OverlapRemovalDirection.DOWN,
    OverlapRemovalDirection.LEFT,
    OverlapRemovalDirection.RIGHT,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly OverlapRemovalDirection[] {
    return OverlapRemovalDirection.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): OverlapRemovalDirection {
    const found = OverlapRemovalDirection.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.common.overlaps.RectangleStripOverlapRemover.OverlapRemovalDirection.${name}`,
      );
    }
    return found;
  }

  name(): string {
    return this.#name;
  }

  ordinal(): number {
    return this.#ordinal;
  }

  toString(): string {
    return this.#name;
  }
}
