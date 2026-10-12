// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Definition of layout directions. To be accessed using {@link CoreOptions#DIRECTION}.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/Direction.java
 */
export class Direction {
  /** undefined layout direction. */
  static readonly UNDEFINED: Direction = new Direction('UNDEFINED', 0);
  /** rightward horizontal layout. */
  static readonly RIGHT: Direction = new Direction('RIGHT', 1);
  /** leftward horizontal layout. */
  static readonly LEFT: Direction = new Direction('LEFT', 2);
  /** downward vertical layout. */
  static readonly DOWN: Direction = new Direction('DOWN', 3);
  /** upward vertical layout. */
  static readonly UP: Direction = new Direction('UP', 4);

  static readonly #VALUES: readonly Direction[] = [
    Direction.UNDEFINED,
    Direction.RIGHT,
    Direction.LEFT,
    Direction.DOWN,
    Direction.UP,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly Direction[] {
    return Direction.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): Direction {
    const found = Direction.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.options.Direction.${name}`);
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

  compareTo(other: Direction): number {
    return this.#ordinal - other.#ordinal;
  }

  /**
   * Checks if this layout direction is horizontal. (that is, left or right) An undefined layout
   * direction is not horizontal.
   *
   * @return `true` if the layout direction is horizontal.
   */
  isHorizontal(): boolean {
    return this === Direction.LEFT || this === Direction.RIGHT;
  }

  /**
   * Checks if this layout direction is vertical. (that is, up or down) An undefined layout
   * direction is not vertical.
   *
   * @return `true` if the layout direction is vertical.
   */
  isVertical(): boolean {
    return this === Direction.UP || this === Direction.DOWN;
  }

  /**
   * @return the opposite direction of `this`. For instance, if this is {@link #LEFT},
   *         return {@link #RIGHT}.
   */
  opposite(): Direction {
    switch (this) {
      case Direction.LEFT:
        return Direction.RIGHT;
      case Direction.RIGHT:
        return Direction.LEFT;
      case Direction.UP:
        return Direction.DOWN;
      case Direction.DOWN:
        return Direction.UP;
      default:
        return Direction.UNDEFINED;
    }
  }
}
