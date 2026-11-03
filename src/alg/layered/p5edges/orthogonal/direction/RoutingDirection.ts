// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../../java/lang/IllegalArgumentException.js';

/**
 * Enumeration of available routing directions. This is different from a graph's {@link Direction} because different
 * routing directions may arise in a single graph. Also, we don't have an east-to-west routing direction here.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/orthogonal/direction/RoutingDirection.java
 */
export class RoutingDirection {
  /** west to east routing direction. */
  static readonly WEST_TO_EAST: RoutingDirection = new RoutingDirection('WEST_TO_EAST', 0);
  /** north to south routing direction. */
  static readonly NORTH_TO_SOUTH: RoutingDirection = new RoutingDirection('NORTH_TO_SOUTH', 1);
  /** south to north routing direction. */
  static readonly SOUTH_TO_NORTH: RoutingDirection = new RoutingDirection('SOUTH_TO_NORTH', 2);

  static readonly #VALUES: readonly RoutingDirection[] = [
    RoutingDirection.WEST_TO_EAST,
    RoutingDirection.NORTH_TO_SOUTH,
    RoutingDirection.SOUTH_TO_NORTH,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly RoutingDirection[] {
    return RoutingDirection.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): RoutingDirection {
    const found = RoutingDirection.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.p5edges.orthogonal.direction.RoutingDirection.${name}`,
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

  compareTo(other: RoutingDirection): number {
    return this.#ordinal - other.#ordinal;
  }
}
