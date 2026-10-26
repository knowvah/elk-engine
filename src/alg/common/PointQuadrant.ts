// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Represents a quadrant of a plane split into four parts (Java nested enum `Point.Quadrant`).
 *
 * ```
 *  Q1 | Q2
 * ---------
 *  Q4 | Q3
 * ```
 *
 * @see org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/Point.java
 */
export class Quadrant {
  // order important!
  static readonly Q1: Quadrant = new Quadrant('Q1', 0);
  static readonly Q4: Quadrant = new Quadrant('Q4', 1);
  static readonly Q2: Quadrant = new Quadrant('Q2', 2);
  static readonly Q3: Quadrant = new Quadrant('Q3', 3);

  static readonly #VALUES: readonly Quadrant[] = [Quadrant.Q1, Quadrant.Q4, Quadrant.Q2, Quadrant.Q3];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly Quadrant[] {
    return Quadrant.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): Quadrant {
    const found = Quadrant.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.alg.common.Point.Quadrant.${name}`);
    }
    return found;
  }

  /** @returns whether this is Q1 or Q2. */
  isUpper(): boolean {
    return this === Quadrant.Q1 || this === Quadrant.Q2;
  }

  /** @returns whether this is Q1 or Q4. */
  isLeft(): boolean {
    return this === Quadrant.Q1 || this === Quadrant.Q4;
  }

  /**
   * @returns true if both q1 and q2 are either located in Q1 and Q4 or are located in Q2 and Q3.
   */
  static isBothLeftOrBothRight(q1: Quadrant, q2: Quadrant): boolean {
    return (
      (q1 === Quadrant.Q1 && q2 === Quadrant.Q4) ||
      (q1 === Quadrant.Q4 && q2 === Quadrant.Q1) ||
      (q1 === Quadrant.Q3 && q2 === Quadrant.Q2) ||
      (q1 === Quadrant.Q2 && q2 === Quadrant.Q3)
    );
  }

  /**
   * @returns true if one of q1 and q2 is located in Q1 or Q4 and the other one is located in Q2 or Q3.
   */
  static isOneLeftOneRight(q1: Quadrant, q2: Quadrant): boolean {
    return (
      (q1 === Quadrant.Q1 && q2 === Quadrant.Q2) ||
      (q1 === Quadrant.Q1 && q2 === Quadrant.Q3) ||
      (q1 === Quadrant.Q4 && q2 === Quadrant.Q3) ||
      (q1 === Quadrant.Q4 && q2 === Quadrant.Q2)
    );
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

  compareTo(other: Quadrant): number {
    return this.#ordinal - other.#ordinal;
  }
}
