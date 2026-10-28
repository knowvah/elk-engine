// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/LongEdgeOrderingStrategy.java
 */
export class LongEdgeOrderingStrategy {
  static readonly DUMMY_NODE_OVER: LongEdgeOrderingStrategy = new LongEdgeOrderingStrategy('DUMMY_NODE_OVER', 0);
  static readonly DUMMY_NODE_UNDER: LongEdgeOrderingStrategy = new LongEdgeOrderingStrategy('DUMMY_NODE_UNDER', 1);
  static readonly EQUAL: LongEdgeOrderingStrategy = new LongEdgeOrderingStrategy('EQUAL', 2);

  static readonly #VALUES: readonly LongEdgeOrderingStrategy[] = [
    LongEdgeOrderingStrategy.DUMMY_NODE_OVER,
    LongEdgeOrderingStrategy.DUMMY_NODE_UNDER,
    LongEdgeOrderingStrategy.EQUAL,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly LongEdgeOrderingStrategy[] {
    return LongEdgeOrderingStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): LongEdgeOrderingStrategy {
    const found = LongEdgeOrderingStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.LongEdgeOrderingStrategy.${name}`,
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

  compareTo(other: LongEdgeOrderingStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Returns a value for a comparator to implement the desired sorting strategy. */
  returnValue(): number {
    switch (this) {
      case LongEdgeOrderingStrategy.DUMMY_NODE_OVER:
        return JavaInteger.MAX_VALUE;
      case LongEdgeOrderingStrategy.DUMMY_NODE_UNDER:
        return JavaInteger.MIN_VALUE;
      default:
        return 0;
    }
  }
}
