// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/PortType.java
 */
export class PortType {
  static readonly UNDEFINED: PortType = new PortType('UNDEFINED', 0);
  static readonly INPUT: PortType = new PortType('INPUT', 1);
  static readonly OUTPUT: PortType = new PortType('OUTPUT', 2);

  static readonly #VALUES: readonly PortType[] = [PortType.UNDEFINED, PortType.INPUT, PortType.OUTPUT];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly PortType[] {
    return PortType.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): PortType {
    const found = PortType.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.alg.layered.options.PortType.${name}`);
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

  compareTo(other: PortType): number {
    return this.#ordinal - other.#ordinal;
  }
}
