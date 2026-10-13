// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Definition of port constraints. To be accessed using {@link CoreOptions#PORT_CONSTRAINTS}.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/PortConstraints.java
 */
export class PortConstraints {
  /** Undefined constraints. */
  static readonly UNDEFINED: PortConstraints = new PortConstraints('UNDEFINED', 0);
  /** All ports are free. */
  static readonly FREE: PortConstraints = new PortConstraints('FREE', 1);
  /** The side is fixed for each port. */
  static readonly FIXED_SIDE: PortConstraints = new PortConstraints('FIXED_SIDE', 2);
  /** The side is fixed for each port, and the order of ports is fixed for each side. */
  static readonly FIXED_ORDER: PortConstraints = new PortConstraints('FIXED_ORDER', 3);
  /** The side is fixed for each port, the order or ports is fixed for each side and
   * the relative position of each port must be preserved. That means if the node is
   * resized by factor x, the port's position must also be scaled by x. */
  static readonly FIXED_RATIO: PortConstraints = new PortConstraints('FIXED_RATIO', 4);
  /** The exact position is fixed for each port. */
  static readonly FIXED_POS: PortConstraints = new PortConstraints('FIXED_POS', 5);

  static readonly #VALUES: readonly PortConstraints[] = [
    PortConstraints.UNDEFINED,
    PortConstraints.FREE,
    PortConstraints.FIXED_SIDE,
    PortConstraints.FIXED_ORDER,
    PortConstraints.FIXED_RATIO,
    PortConstraints.FIXED_POS,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly PortConstraints[] {
    return PortConstraints.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): PortConstraints {
    const found = PortConstraints.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.options.PortConstraints.${name}`);
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

  compareTo(other: PortConstraints): number {
    return this.#ordinal - other.#ordinal;
  }

  /**
   * Returns whether the position of the ports is fixed. Note that this is not true
   * if port ratios are fixed.
   *
   * @return true if the position is fixed
   */
  isPosFixed(): boolean {
    return this === PortConstraints.FIXED_POS;
  }

  /**
   * Returns whether the ratio of port positions is fixed. Note that this is not true
   * if the port positions are fixed.
   *
   * @return true if the ratio is fixed
   */
  isRatioFixed(): boolean {
    return this === PortConstraints.FIXED_RATIO;
  }

  /**
   * Returns whether the order of ports is fixed.
   *
   * @return true if the order of ports is fixed
   */
  isOrderFixed(): boolean {
    return (
      this === PortConstraints.FIXED_ORDER || this === PortConstraints.FIXED_RATIO || this === PortConstraints.FIXED_POS
    );
  }

  /**
   * Returns whether the sides of ports are fixed.
   *
   * @see PortSide
   * @return true if the port sides are fixed
   */
  isSideFixed(): boolean {
    return this !== PortConstraints.FREE && this !== PortConstraints.UNDEFINED;
  }
}
