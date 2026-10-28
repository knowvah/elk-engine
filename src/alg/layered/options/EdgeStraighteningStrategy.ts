// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/EdgeStraighteningStrategy.java
 */
export class EdgeStraighteningStrategy {
  static readonly NONE: EdgeStraighteningStrategy = new EdgeStraighteningStrategy('NONE', 0);
  static readonly IMPROVE_STRAIGHTNESS: EdgeStraighteningStrategy = new EdgeStraighteningStrategy(
    'IMPROVE_STRAIGHTNESS',
    1,
  );

  static readonly #VALUES: readonly EdgeStraighteningStrategy[] = [
    EdgeStraighteningStrategy.NONE,
    EdgeStraighteningStrategy.IMPROVE_STRAIGHTNESS,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly EdgeStraighteningStrategy[] {
    return EdgeStraighteningStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): EdgeStraighteningStrategy {
    const found = EdgeStraighteningStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.EdgeStraighteningStrategy.${name}`,
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

  compareTo(other: EdgeStraighteningStrategy): number {
    return this.#ordinal - other.#ordinal;
  }
}
