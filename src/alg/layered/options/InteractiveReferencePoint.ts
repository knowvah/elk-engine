// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/InteractiveReferencePoint.java
 */
export class InteractiveReferencePoint {
  static readonly CENTER: InteractiveReferencePoint = new InteractiveReferencePoint('CENTER', 0);
  static readonly TOP_LEFT: InteractiveReferencePoint = new InteractiveReferencePoint('TOP_LEFT', 1);

  static readonly #VALUES: readonly InteractiveReferencePoint[] = [
    InteractiveReferencePoint.CENTER,
    InteractiveReferencePoint.TOP_LEFT,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly InteractiveReferencePoint[] {
    return InteractiveReferencePoint.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): InteractiveReferencePoint {
    const found = InteractiveReferencePoint.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.InteractiveReferencePoint.${name}`,
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

  compareTo(other: InteractiveReferencePoint): number {
    return this.#ordinal - other.#ordinal;
  }
}
