// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { EnumSet } from '../../java/util/EnumSet.js';

/**
 * Things to take into account when determining the size of a node. Each item of this enumeration
 * corresponds to something a layout algorithm should pay attention to when calculating node sizes.
 * Usually, one will use a combination of these values in an `EnumSet` instance, with the
 * empty set meaning that node sizes are fixed. **This enumeration is not set directly on
 * {@link CoreOptions#SIZE_CONSTRAINT}; instead, an `EnumSet` over this enumeration is used
 * there.**
 *
 * _Note:_ Layout algorithms may only support a subset of these options.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/SizeConstraint.java
 */
export class SizeConstraint {
  /**
   * The number of ports and their position should be taken into account when determining the
   * size of nodes. The sum of port widths and heights and the minimum spacing between ports
   * is a lower bound for the node size.
   */
  static readonly PORTS: SizeConstraint = new SizeConstraint('PORTS', 0);

  /**
   * Ports labels are taken into account when determining the size of nodes. Depending on where
   * the labels are positioned the node will be made large enough to avoid overlaps and to try
   * to place labels in as unambiguous a way as possible. Setting this option doesn't make any
   * sense if the {@link #PORTS} option is not set as well.
   */
  static readonly PORT_LABELS: SizeConstraint = new SizeConstraint('PORT_LABELS', 1);

  /**
   * A node's labels are taken into account.
   */
  static readonly NODE_LABELS: SizeConstraint = new SizeConstraint('NODE_LABELS', 2);

  /**
   * If set, a node's size will be at least the minimum size set on it. If no minimum size is set,
   * the behavior depends on whether the {@link SizeOptions#DEFAULT_MINIMUM_SIZE} constraint is
   * set as well.
   */
  static readonly MINIMUM_SIZE: SizeConstraint = new SizeConstraint('MINIMUM_SIZE', 3);

  static readonly #VALUES: readonly SizeConstraint[] = [
    SizeConstraint.PORTS,
    SizeConstraint.PORT_LABELS,
    SizeConstraint.NODE_LABELS,
    SizeConstraint.MINIMUM_SIZE,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly SizeConstraint[] {
    return SizeConstraint.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): SizeConstraint {
    const found = SizeConstraint.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.options.SizeConstraint.${name}`);
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

  compareTo(other: SizeConstraint): number {
    return this.#ordinal - other.#ordinal;
  }

  /**
   * Returns an empty enum set over this enumeration, which corresponds to fixed size constraints.
   *
   * @return set over this enumeration representing fixed size constraints.
   */
  static fixed(): EnumSet<SizeConstraint> {
    return EnumSet.noneOf(SizeConstraint);
  }

  /**
   * Returns a set containing the {@link #MINIMUM_SIZE} constraint.
   *
   * @return set with minimum size constraint.
   */
  static minimumSize(): EnumSet<SizeConstraint> {
    return EnumSet.of(SizeConstraint.MINIMUM_SIZE);
  }

  /**
   * Returns a set containing the common combination of {@link #MINIMUM_SIZE} and {@link #PORTS}.
   *
   * @return set with minimum size constraint in combination with ports.
   */
  static minimumSizeWithPorts(): EnumSet<SizeConstraint> {
    return EnumSet.of(SizeConstraint.PORTS, SizeConstraint.MINIMUM_SIZE);
  }

  /**
   * Returns a set containing all options defined in this enumeration, effectively giving
   * the layout algorithm as much freedom as possible in determining the node size.
   *
   * @return set with all available options.
   */
  static free(): EnumSet<SizeConstraint> {
    return EnumSet.allOf(SizeConstraint);
  }
}
