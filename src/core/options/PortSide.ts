// SPDX-License-Identifier: EPL-2.0
import { immutableEnumSet, immutableEnumSetOf } from '../../guava/Sets.js';
import type { ImmutableSet } from '../../guava/ImmutableSet.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { Direction } from './Direction.js';

/**
 * Definition of port sides on a node. Besides defining the actual available port sides, this enumeration
 * also defines convenience methods as well as constants with all possible port side combinations. The
 * latter are named in a clockwise manner, starting at the northern side.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/PortSide.java
 */
export class PortSide {
  /** the side is undefined. */
  static readonly UNDEFINED: PortSide = new PortSide('UNDEFINED', 0);
  /** top side. */
  static readonly NORTH: PortSide = new PortSide('NORTH', 1);
  /** right side. */
  static readonly EAST: PortSide = new PortSide('EAST', 2);
  /** bottom side. */
  static readonly SOUTH: PortSide = new PortSide('SOUTH', 3);
  /** left side. */
  static readonly WEST: PortSide = new PortSide('WEST', 4);

  static readonly #VALUES: readonly PortSide[] = [
    PortSide.UNDEFINED,
    PortSide.NORTH,
    PortSide.EAST,
    PortSide.SOUTH,
    PortSide.WEST,
  ];

  //////////////////////////////////////////////////////////////////////////////////////////////
  // Port Side Combinations

  // The Java sets are built after all constants exist (static initializers run in textual order).
  // SIDES_NONE is `Collections.unmodifiableSet(EnumSet.noneOf(PortSide.class))` in Java; an empty
  // Guava immutable enum set is observably the same (empty, unmodifiable).

  /** Immutable set containing the given port sides. */
  static readonly SIDES_NONE: ImmutableSet<PortSide> = immutableEnumSet<PortSide>([]);
  /** Immutable set containing the given port sides. */
  static readonly SIDES_NORTH: ImmutableSet<PortSide> = immutableEnumSetOf(PortSide.NORTH);
  /** Immutable set containing the given port sides. */
  static readonly SIDES_EAST: ImmutableSet<PortSide> = immutableEnumSetOf(PortSide.EAST);
  /** Immutable set containing the given port sides. */
  static readonly SIDES_SOUTH: ImmutableSet<PortSide> = immutableEnumSetOf(PortSide.SOUTH);
  /** Immutable set containing the given port sides. */
  static readonly SIDES_WEST: ImmutableSet<PortSide> = immutableEnumSetOf(PortSide.WEST);
  /** Immutable set containing the given port sides. */
  static readonly SIDES_NORTH_SOUTH: ImmutableSet<PortSide> = immutableEnumSetOf(PortSide.NORTH, PortSide.SOUTH);
  /** Immutable set containing the given port sides. */
  static readonly SIDES_EAST_WEST: ImmutableSet<PortSide> = immutableEnumSetOf(PortSide.EAST, PortSide.WEST);
  /** Immutable set containing the given port sides. */
  static readonly SIDES_NORTH_WEST: ImmutableSet<PortSide> = immutableEnumSetOf(PortSide.NORTH, PortSide.WEST);
  /** Immutable set containing the given port sides. */
  static readonly SIDES_NORTH_EAST: ImmutableSet<PortSide> = immutableEnumSetOf(PortSide.NORTH, PortSide.EAST);
  /** Immutable set containing the given port sides. */
  static readonly SIDES_SOUTH_WEST: ImmutableSet<PortSide> = immutableEnumSetOf(PortSide.SOUTH, PortSide.WEST);
  /** Immutable set containing the given port sides. */
  static readonly SIDES_EAST_SOUTH: ImmutableSet<PortSide> = immutableEnumSetOf(PortSide.EAST, PortSide.SOUTH);
  /** Immutable set containing the given port sides. */
  static readonly SIDES_NORTH_EAST_WEST: ImmutableSet<PortSide> = immutableEnumSetOf(
    PortSide.NORTH,
    PortSide.EAST,
    PortSide.WEST,
  );
  /** Immutable set containing the given port sides. */
  static readonly SIDES_EAST_SOUTH_WEST: ImmutableSet<PortSide> = immutableEnumSetOf(
    PortSide.EAST,
    PortSide.SOUTH,
    PortSide.WEST,
  );
  /** Immutable set containing the given port sides. */
  static readonly SIDES_NORTH_SOUTH_WEST: ImmutableSet<PortSide> = immutableEnumSetOf(
    PortSide.NORTH,
    PortSide.SOUTH,
    PortSide.WEST,
  );
  /** Immutable set containing the given port sides. */
  static readonly SIDES_NORTH_EAST_SOUTH: ImmutableSet<PortSide> = immutableEnumSetOf(
    PortSide.NORTH,
    PortSide.EAST,
    PortSide.SOUTH,
  );
  /** Immutable set containing the given port sides. */
  static readonly SIDES_NORTH_EAST_SOUTH_WEST: ImmutableSet<PortSide> = immutableEnumSetOf(
    PortSide.NORTH,
    PortSide.EAST,
    PortSide.SOUTH,
    PortSide.WEST,
  );

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly PortSide[] {
    return PortSide.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): PortSide {
    const found = PortSide.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.options.PortSide.${name}`);
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

  compareTo(other: PortSide): number {
    return this.#ordinal - other.#ordinal;
  }

  //////////////////////////////////////////////////////////////////////////////////////////////
  // Convenience Methods

  /**
   * Returns the next side in clockwise order.
   *
   * @return the next side in clockwise order
   */
  right(): PortSide {
    switch (this) {
      case PortSide.NORTH:
        return PortSide.EAST;
      case PortSide.EAST:
        return PortSide.SOUTH;
      case PortSide.SOUTH:
        return PortSide.WEST;
      case PortSide.WEST:
        return PortSide.NORTH;
      default:
        return PortSide.UNDEFINED;
    }
  }

  /**
   * Returns the next side in counter-clockwise order.
   *
   * @return the next side in counter-clockwise order
   */
  left(): PortSide {
    switch (this) {
      case PortSide.NORTH:
        return PortSide.WEST;
      case PortSide.EAST:
        return PortSide.NORTH;
      case PortSide.SOUTH:
        return PortSide.EAST;
      case PortSide.WEST:
        return PortSide.SOUTH;
      default:
        return PortSide.UNDEFINED;
    }
  }

  /**
   * Returns the opposed side.
   *
   * @return the opposed side
   */
  opposed(): PortSide {
    switch (this) {
      case PortSide.NORTH:
        return PortSide.SOUTH;
      case PortSide.EAST:
        return PortSide.WEST;
      case PortSide.SOUTH:
        return PortSide.NORTH;
      case PortSide.WEST:
        return PortSide.EAST;
      default:
        return PortSide.UNDEFINED;
    }
  }

  /**
   * Returns whether this and the given port side are adjacent port sides in that they share a corner of their node.
   *
   * @param other the port side to check with.
   * @return `true` if the two sides share a corner.
   */
  areAdjacent(other: PortSide): boolean {
    if (this === PortSide.UNDEFINED) {
      return false;
    } else {
      return this.left() === other || this.right() === other;
    }
  }

  /**
   * Get the port side that corresponds to the given direction.
   *
   * @param direction a direction
   * @return the corresponding port side
   */
  static fromDirection(direction: Direction): PortSide {
    switch (direction) {
      case Direction.UP:
        return PortSide.NORTH;
      case Direction.RIGHT:
        return PortSide.EAST;
      case Direction.DOWN:
        return PortSide.SOUTH;
      case Direction.LEFT:
        return PortSide.WEST;
      default:
        return PortSide.UNDEFINED;
    }
  }

  static isVertical(side: PortSide): boolean {
    return side === PortSide.NORTH || side === PortSide.SOUTH;
  }

  static isHorizontal(side: PortSide): boolean {
    return side === PortSide.WEST || side === PortSide.EAST;
  }
}
