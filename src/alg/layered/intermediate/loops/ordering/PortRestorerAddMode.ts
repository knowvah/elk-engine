// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../../java/lang/IllegalArgumentException.js';

/**
 * Whether to prepend or append items to a list. Java nests this enum in `PortRestorer`; it lives in its own file here.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/ordering/PortRestorer.java#AddMode
 */
export class AddMode {
  static readonly PREPEND: AddMode = new AddMode('PREPEND', 0);
  static readonly APPEND: AddMode = new AddMode('APPEND', 1);

  static readonly #VALUES: readonly AddMode[] = [AddMode.PREPEND, AddMode.APPEND];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly AddMode[] {
    return AddMode.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): AddMode {
    const found = AddMode.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.intermediate.loops.ordering.PortRestorer.AddMode.${name}`,
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

  compareTo(other: AddMode): number {
    return this.#ordinal - other.#ordinal;
  }
}
