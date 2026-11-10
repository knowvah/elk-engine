// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../../java/lang/IllegalArgumentException.js';

/**
 * The three different areas of a port side, interpreted in clockwise order. Java nests this enum in `PortRestorer`; it lives in its own file here.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/ordering/PortRestorer.java#PortSideArea
 */
export class PortSideArea {
  static readonly START: PortSideArea = new PortSideArea('START', 0);
  static readonly MIDDLE: PortSideArea = new PortSideArea('MIDDLE', 1);
  static readonly END: PortSideArea = new PortSideArea('END', 2);

  static readonly #VALUES: readonly PortSideArea[] = [PortSideArea.START, PortSideArea.MIDDLE, PortSideArea.END];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly PortSideArea[] {
    return PortSideArea.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): PortSideArea {
    const found = PortSideArea.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.intermediate.loops.ordering.PortRestorer.PortSideArea.${name}`,
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

  compareTo(other: PortSideArea): number {
    return this.#ordinal - other.#ordinal;
  }
}
