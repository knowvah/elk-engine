// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Defines the distribution of ports.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/PortAlignment.java
 */
export class PortAlignment {
  /** Ports are evenly distributed, with the same amount of space between and around them. */
  static readonly DISTRIBUTED: PortAlignment = new PortAlignment('DISTRIBUTED', 0);
  /** Ports are justified and use up all the space except for the surrounding ports spacing. */
  static readonly JUSTIFIED: PortAlignment = new PortAlignment('JUSTIFIED', 1);
  /** Ports are placed at the most top respectively left position with minimal spacing. */
  static readonly BEGIN: PortAlignment = new PortAlignment('BEGIN', 2);
  /** Ports are centered with minimal spacing. */
  static readonly CENTER: PortAlignment = new PortAlignment('CENTER', 3);
  /** Ports are placed at the most top respectively left position with minimal spacing. */
  static readonly END: PortAlignment = new PortAlignment('END', 4);

  static readonly #VALUES: readonly PortAlignment[] = [
    PortAlignment.DISTRIBUTED,
    PortAlignment.JUSTIFIED,
    PortAlignment.BEGIN,
    PortAlignment.CENTER,
    PortAlignment.END,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly PortAlignment[] {
    return PortAlignment.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): PortAlignment {
    const found = PortAlignment.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.options.PortAlignment.${name}`);
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

  compareTo(other: PortAlignment): number {
    return this.#ordinal - other.#ordinal;
  }
}
