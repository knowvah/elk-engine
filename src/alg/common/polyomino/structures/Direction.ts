// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * Cardinal directions, e.g. for describing the extension of a polyomino.
 *
 * @see alg.common/src/org/eclipse/elk/alg/common/polyomino/structures/Direction.java
 */
export class Direction {
  static readonly NORTH: Direction = new Direction('NORTH', 0, false);
  static readonly EAST: Direction = new Direction('EAST', 1, true);
  static readonly SOUTH: Direction = new Direction('SOUTH', 2, false);
  static readonly WEST: Direction = new Direction('WEST', 3, true);

  static readonly #VALUES: readonly Direction[] = [Direction.NORTH, Direction.EAST, Direction.SOUTH, Direction.WEST];

  readonly #name: string;
  readonly #ordinal: number;
  readonly #horizontal: boolean;

  private constructor(name: string, ordinal: number, horizontal: boolean) {
    this.#name = name;
    this.#ordinal = ordinal;
    this.#horizontal = horizontal;
  }

  /** The constants in declaration order. */
  static values(): readonly Direction[] {
    return Direction.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): Direction {
    const found = Direction.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.common.polyomino.structures.Direction.${name}`,
      );
    }
    return found;
  }

  /** @returns true if this direction is EAST or WEST. */
  isHorizontal(): boolean {
    return this.#horizontal;
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

  compareTo(other: Direction): number {
    return this.#ordinal - other.#ordinal;
  }
}
