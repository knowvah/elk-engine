// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * Dimensions in which nodes may be moved.
 *
 * `StressMajorization.Dimension` in its own file (C3); the outer class re-exposes it as
 * `static readonly Dimension = Dimension`.
 *
 * @see org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force/stress/StressMajorization.java
 */
export class Dimension {
  /** Both x and y allowed. */
  static readonly XY: Dimension = new Dimension('XY', 0);
  /** Nodes may only move in x. */
  static readonly X: Dimension = new Dimension('X', 1);
  /** Nodes may only move in y. */
  static readonly Y: Dimension = new Dimension('Y', 2);

  static readonly #VALUES: readonly Dimension[] = [Dimension.XY, Dimension.X, Dimension.Y];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly Dimension[] {
    return Dimension.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): Dimension {
    const found = Dimension.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.force.stress.StressMajorization.Dimension.${name}`,
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

  compareTo(other: Dimension): number {
    return this.#ordinal - other.#ordinal;
  }
}
