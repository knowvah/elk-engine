// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { EnumSet } from '../../java/util/EnumSet.js';

/**
 * Defines the placement of port labels.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/PortLabelPlacement.java
 */
export class PortLabelPlacement {
  static readonly OUTSIDE: PortLabelPlacement = new PortLabelPlacement('OUTSIDE', 0);
  static readonly INSIDE: PortLabelPlacement = new PortLabelPlacement('INSIDE', 1);
  static readonly NEXT_TO_PORT_IF_POSSIBLE: PortLabelPlacement = new PortLabelPlacement('NEXT_TO_PORT_IF_POSSIBLE', 2);
  static readonly ALWAYS_SAME_SIDE: PortLabelPlacement = new PortLabelPlacement('ALWAYS_SAME_SIDE', 3);
  static readonly ALWAYS_OTHER_SAME_SIDE: PortLabelPlacement = new PortLabelPlacement('ALWAYS_OTHER_SAME_SIDE', 4);
  static readonly SPACE_EFFICIENT: PortLabelPlacement = new PortLabelPlacement('SPACE_EFFICIENT', 5);

  static readonly #VALUES: readonly PortLabelPlacement[] = [
    PortLabelPlacement.OUTSIDE,
    PortLabelPlacement.INSIDE,
    PortLabelPlacement.NEXT_TO_PORT_IF_POSSIBLE,
    PortLabelPlacement.ALWAYS_SAME_SIDE,
    PortLabelPlacement.ALWAYS_OTHER_SAME_SIDE,
    PortLabelPlacement.SPACE_EFFICIENT,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly PortLabelPlacement[] {
    return PortLabelPlacement.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): PortLabelPlacement {
    const found = PortLabelPlacement.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.options.PortLabelPlacement.${name}`);
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

  compareTo(other: PortLabelPlacement): number {
    return this.#ordinal - other.#ordinal;
  }

  /** @see PortLabelPlacement#fixed() */
  static fixed(): EnumSet<PortLabelPlacement> {
    return EnumSet.noneOf(PortLabelPlacement);
  }

  /** @see PortLabelPlacement#inside() */
  static inside(): EnumSet<PortLabelPlacement> {
    return EnumSet.of(PortLabelPlacement.INSIDE);
  }

  /** @see PortLabelPlacement#outside() */
  static outside(): EnumSet<PortLabelPlacement> {
    return EnumSet.of(PortLabelPlacement.OUTSIDE);
  }

  /** @see PortLabelPlacement#isFixed(Set) */
  static isFixed(placement: EnumSet<PortLabelPlacement>): boolean {
    return !placement.contains(PortLabelPlacement.INSIDE) && !placement.contains(PortLabelPlacement.OUTSIDE);
  }

  /**
   * Checks whether the given placement set is valid: at most one of INSIDE/OUTSIDE and at most one
   * of the position constants. `Sets.intersection(group, placement).size() > 1` is a count of the
   * group members the placement contains.
   *
   * @see PortLabelPlacement#isValid(Set)
   */
  static isValid(placement: EnumSet<PortLabelPlacement>): boolean {
    const groups: readonly (readonly PortLabelPlacement[])[] = [
      [PortLabelPlacement.INSIDE, PortLabelPlacement.OUTSIDE],
      [
        PortLabelPlacement.ALWAYS_SAME_SIDE,
        PortLabelPlacement.ALWAYS_OTHER_SAME_SIDE,
        PortLabelPlacement.SPACE_EFFICIENT,
      ],
    ];
    return groups.every((group) => group.filter((member) => placement.contains(member)).length <= 1);
  }
}
