// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';

/**
 * Determines how raw values are normalized (Java: the nested enum `AbstractNormalizedMatcher.NormalizationFunction`).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/comments/AbstractNormalizedMatcher.java
 */
export class AbstractNormalizedMatcherNormalizationFunction {
  /** Values are normalized linearly between the worst and the best raw value. */
  static readonly LINEAR: AbstractNormalizedMatcherNormalizationFunction =
    new AbstractNormalizedMatcherNormalizationFunction('LINEAR', 0);
  /** Values are normalized to 0 or 1 only. */
  static readonly BINARY: AbstractNormalizedMatcherNormalizationFunction =
    new AbstractNormalizedMatcherNormalizationFunction('BINARY', 1);

  static readonly #VALUES: readonly AbstractNormalizedMatcherNormalizationFunction[] = [
    AbstractNormalizedMatcherNormalizationFunction.LINEAR,
    AbstractNormalizedMatcherNormalizationFunction.BINARY,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly AbstractNormalizedMatcherNormalizationFunction[] {
    return AbstractNormalizedMatcherNormalizationFunction.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): AbstractNormalizedMatcherNormalizationFunction {
    const found = AbstractNormalizedMatcherNormalizationFunction.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.core.comments.AbstractNormalizedMatcher.NormalizationFunction.${name}`,
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

  compareTo(other: AbstractNormalizedMatcherNormalizationFunction): number {
    return this.#ordinal - other.#ordinal;
  }
}
