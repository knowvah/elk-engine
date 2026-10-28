// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/ValidifyStrategy.java
 */
export class ValidifyStrategy {
  static readonly NO: ValidifyStrategy = new ValidifyStrategy('NO', 0);
  static readonly GREEDY: ValidifyStrategy = new ValidifyStrategy('GREEDY', 1);
  static readonly LOOK_BACK: ValidifyStrategy = new ValidifyStrategy('LOOK_BACK', 2);

  static readonly #VALUES: readonly ValidifyStrategy[] = [
    ValidifyStrategy.NO,
    ValidifyStrategy.GREEDY,
    ValidifyStrategy.LOOK_BACK,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly ValidifyStrategy[] {
    return ValidifyStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): ValidifyStrategy {
    const found = ValidifyStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.ValidifyStrategy.${name}`,
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

  compareTo(other: ValidifyStrategy): number {
    return this.#ordinal - other.#ordinal;
  }
}
