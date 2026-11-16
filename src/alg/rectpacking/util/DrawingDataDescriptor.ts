// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * Enumerate that specifies if a {@link DrawingData} object represents the values of a candidate position or a set
 * drawing of a rectangle.
 *
 * @see alg.rectpacking/src/org/eclipse/elk/alg/rectpacking/util/DrawingDataDescriptor.java
 */
export class DrawingDataDescriptor {
  /** Placing rectangle to the right of the most recently placed rectangle. */
  static readonly CANDIDATE_POSITION_LAST_PLACED_RIGHT: DrawingDataDescriptor = new DrawingDataDescriptor(
    'CANDIDATE_POSITION_LAST_PLACED_RIGHT',
    0,
  );
  /** Placing rectangle to below the most recently placed rectangle. */
  static readonly CANDIDATE_POSITION_LAST_PLACED_BELOW: DrawingDataDescriptor = new DrawingDataDescriptor(
    'CANDIDATE_POSITION_LAST_PLACED_BELOW',
    1,
  );
  /** Placing rectangle to the right of the whole drawing. */
  static readonly CANDIDATE_POSITION_WHOLE_DRAWING_RIGHT: DrawingDataDescriptor = new DrawingDataDescriptor(
    'CANDIDATE_POSITION_WHOLE_DRAWING_RIGHT',
    2,
  );
  /** Placing rectangle to below of the whole drawing. */
  static readonly CANDIDATE_POSITION_WHOLE_DRAWING_BELOW: DrawingDataDescriptor = new DrawingDataDescriptor(
    'CANDIDATE_POSITION_WHOLE_DRAWING_BELOW',
    3,
  );
  /** Indicating that a {@link DrawingData} object refers to a actual drawing and not a placement option. */
  static readonly WHOLE_DRAWING: DrawingDataDescriptor = new DrawingDataDescriptor('WHOLE_DRAWING', 4);

  static readonly #VALUES: readonly DrawingDataDescriptor[] = [
    DrawingDataDescriptor.CANDIDATE_POSITION_LAST_PLACED_RIGHT,
    DrawingDataDescriptor.CANDIDATE_POSITION_LAST_PLACED_BELOW,
    DrawingDataDescriptor.CANDIDATE_POSITION_WHOLE_DRAWING_RIGHT,
    DrawingDataDescriptor.CANDIDATE_POSITION_WHOLE_DRAWING_BELOW,
    DrawingDataDescriptor.WHOLE_DRAWING,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly DrawingDataDescriptor[] {
    return DrawingDataDescriptor.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): DrawingDataDescriptor {
    const found = DrawingDataDescriptor.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.rectpacking.util.DrawingDataDescriptor.${name}`,
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

  compareTo(other: DrawingDataDescriptor): number {
    return this.#ordinal - other.#ordinal;
  }
}
