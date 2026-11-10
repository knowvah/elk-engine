// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../../core/options/PortSide.js';
import { IllegalArgumentException } from '../../../../../java/lang/IllegalArgumentException.js';

/**
 * The way we'll be distributing our ports. Self loops will be assigned to sides following this pattern. Java nests this
 * enum in `PortSideAssigner`; it lives in its own file here. The two sides are read lazily (a thunk per side) so that
 * importing this module reads no `PortSide` constant.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/ordering/PortSideAssigner.java#Target
 */
export class Target {
  static readonly NORTH: Target = new Target(
    'NORTH',
    0,
    () => PortSide.NORTH,
    () => PortSide.NORTH,
  );
  static readonly SOUTH: Target = new Target(
    'SOUTH',
    1,
    () => PortSide.SOUTH,
    () => PortSide.SOUTH,
  );
  static readonly EAST: Target = new Target(
    'EAST',
    2,
    () => PortSide.EAST,
    () => PortSide.EAST,
  );
  static readonly WEST: Target = new Target(
    'WEST',
    3,
    () => PortSide.WEST,
    () => PortSide.WEST,
  );
  static readonly NORTH_WEST_CORNER: Target = new Target(
    'NORTH_WEST_CORNER',
    4,
    () => PortSide.WEST,
    () => PortSide.NORTH,
  );
  static readonly NORTH_EAST_CORNER: Target = new Target(
    'NORTH_EAST_CORNER',
    5,
    () => PortSide.NORTH,
    () => PortSide.EAST,
  );
  static readonly SOUTH_WEST_CORNER: Target = new Target(
    'SOUTH_WEST_CORNER',
    6,
    () => PortSide.SOUTH,
    () => PortSide.WEST,
  );
  static readonly SOUTH_EAST_CORNER: Target = new Target(
    'SOUTH_EAST_CORNER',
    7,
    () => PortSide.EAST,
    () => PortSide.SOUTH,
  );

  static readonly #VALUES: readonly Target[] = [
    Target.NORTH,
    Target.SOUTH,
    Target.EAST,
    Target.WEST,
    Target.NORTH_WEST_CORNER,
    Target.NORTH_EAST_CORNER,
    Target.SOUTH_WEST_CORNER,
    Target.SOUTH_EAST_CORNER,
  ];

  readonly #name: string;
  readonly #ordinal: number;
  readonly #firstSide: () => PortSide;
  readonly #secondSide: () => PortSide;

  private constructor(name: string, ordinal: number, firstSide: () => PortSide, secondSide: () => PortSide) {
    this.#name = name;
    this.#ordinal = ordinal;
    this.#firstSide = firstSide;
    this.#secondSide = secondSide;
  }

  /** The constants in declaration order. */
  static values(): readonly Target[] {
    return Target.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): Target {
    const found = Target.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.intermediate.loops.ordering.PortSideAssigner.Target.${name}`,
      );
    }
    return found;
  }

  /** The first port side involved in the target. */
  get firstSide(): PortSide {
    return this.#firstSide();
  }

  /** The second port side involved in the target. */
  get secondSide(): PortSide {
    return this.#secondSide();
  }

  /** Returns whether the target spans the corner between two sides. */
  isCornerTarget(): boolean {
    return this.firstSide !== this.secondSide;
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

  compareTo(other: Target): number {
    return this.#ordinal - other.#ordinal;
  }
}
