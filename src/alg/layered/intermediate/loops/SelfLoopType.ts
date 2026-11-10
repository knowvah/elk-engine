// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { PortSide } from '../../../../core/options/PortSide.js';

/**
 * The different types of self loops.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/SelfLoopType.java
 */
export class SelfLoopType {
  /** Connects ports that are all on the same side. */
  static readonly ONE_SIDE: SelfLoopType = new SelfLoopType('ONE_SIDE', 0);
  /** Connects ports on two adjacent sides. */
  static readonly TWO_SIDES_CORNER: SelfLoopType = new SelfLoopType('TWO_SIDES_CORNER', 1);
  /** Connects ports on two opposing sides. */
  static readonly TWO_SIDES_OPPOSING: SelfLoopType = new SelfLoopType('TWO_SIDES_OPPOSING', 2);
  /** Connects ports spread out over three sides. */
  static readonly THREE_SIDES: SelfLoopType = new SelfLoopType('THREE_SIDES', 3);
  /** Connects ports spread out over all four sides. */
  static readonly FOUR_SIDES: SelfLoopType = new SelfLoopType('FOUR_SIDES', 4);

  static readonly #VALUES: readonly SelfLoopType[] = [
    SelfLoopType.ONE_SIDE,
    SelfLoopType.TWO_SIDES_CORNER,
    SelfLoopType.TWO_SIDES_OPPOSING,
    SelfLoopType.THREE_SIDES,
    SelfLoopType.FOUR_SIDES,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly SelfLoopType[] {
    return SelfLoopType.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): SelfLoopType {
    const found = SelfLoopType.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.intermediate.loops.SelfLoopType.${name}`,
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

  compareTo(other: SelfLoopType): number {
    return this.#ordinal - other.#ordinal;
  }

  /**
   * Determines the self loop type for a self loop involving ports on the given sides. The result only depends on the
   * port configuration. In theory, a one-side self loop could be routed around the whole node to reach its target
   * port, thus causing it to occupy all four sides. Java's `Set<PortSide>` is a `ReadonlySet` here (`contains` is
   * `has`, `size()` is `size`).
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/SelfLoopType.java#fromPortSides
   */
  static fromPortSides(portSides: ReadonlySet<PortSide>): SelfLoopType | null {
    if (portSides.has(PortSide.UNDEFINED)) {
      throw new IllegalArgumentException('Port sides must not contain UNDEFINED');
    }

    switch (portSides.size) {
      case 1:
        return SelfLoopType.ONE_SIDE;

      case 2: {
        // Check if we have opposing sides or not
        const eastWest = portSides.has(PortSide.EAST) && portSides.has(PortSide.WEST);
        const northSouth = portSides.has(PortSide.NORTH) && portSides.has(PortSide.SOUTH);

        if (eastWest || northSouth) {
          return SelfLoopType.TWO_SIDES_OPPOSING;
        } else {
          return SelfLoopType.TWO_SIDES_CORNER;
        }
      }

      case 3:
        return SelfLoopType.THREE_SIDES;

      case 4:
        return SelfLoopType.FOUR_SIDES;

      default:
        return null;
    }
  }
}
