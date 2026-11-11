// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * Represents the four cardinal directions.
 *
 * The Java `static { NORTH.horizontal = false; ... }` block assigns the private flag after construction; the port
 * passes it to the constructor (the pattern of the landed `Direction`), with the same values.
 *
 * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCDirection.java
 */
export class DCDirection {
  /** The four cardinal directions. */
  static readonly NORTH: DCDirection = new DCDirection('NORTH', 0, false);
  static readonly EAST: DCDirection = new DCDirection('EAST', 1, true);
  static readonly SOUTH: DCDirection = new DCDirection('SOUTH', 2, false);
  static readonly WEST: DCDirection = new DCDirection('WEST', 3, true);

  static readonly #VALUES: readonly DCDirection[] = [
    DCDirection.NORTH,
    DCDirection.EAST,
    DCDirection.SOUTH,
    DCDirection.WEST,
  ];

  readonly #name: string;
  readonly #ordinal: number;
  readonly #horizontal: boolean;

  private constructor(name: string, ordinal: number, horizontal: boolean) {
    this.#name = name;
    this.#ordinal = ordinal;
    this.#horizontal = horizontal;
  }

  /** The constants in declaration order. */
  static values(): readonly DCDirection[] {
    return DCDirection.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): DCDirection {
    const found = DCDirection.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.alg.disco.graph.DCDirection.${name}`);
    }
    return found;
  }

  /**
   * Returns whether the given direction is horizontal.
   *
   * @returns true, if `EAST` or `WEST`; false, otherwise.
   * @see alg.disco/src/org/eclipse/elk/alg/disco/graph/DCDirection.java
   */
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

  compareTo(other: DCDirection): number {
    return this.#ordinal - other.#ordinal;
  }
}
