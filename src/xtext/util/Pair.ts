// SPDX-License-Identifier: EPL-2.0
import { add, mul } from '../../java/lang/Int32.js';
import * as JavaObjects from '../../java/util/JavaObjects.js';

const SECOND_HASH_FACTOR = 17;

/**
 * An immutable pair with value `equals`/`hashCode` (translation-rules 6.1). Created through
 * {@link Tuples.pair}; the Java constructor is package-private.
 *
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/Pair.java
 */
export class Pair<T, U> {
  /** @internal use `Tuples.pair`. */
  constructor(
    private readonly first: T,
    private readonly second: U,
  ) {}

  getFirst(): T {
    return this.first;
  }

  getSecond(): U {
    return this.second;
  }

  /** Java: same runtime class, then element-wise `equals` (null equals only null). */
  equals(other: unknown): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (this === other) {
      return true;
    }
    if (other instanceof Pair) {
      const otherPair = other as Pair<unknown, unknown>;
      return (
        JavaObjects.equals(this.first, otherPair.getFirst()) && JavaObjects.equals(this.second, otherPair.getSecond())
      );
    }
    return false;
  }

  /** `first.hashCode() + 17 * second.hashCode()` in int arithmetic, 0 for a null element. */
  hashCode(): number {
    return add(JavaObjects.hashCode(this.first), mul(SECOND_HASH_FACTOR, JavaObjects.hashCode(this.second)));
  }

  toString(): string {
    return `Pair(${JavaObjects.toString(this.first)}, ${JavaObjects.toString(this.second)})`;
  }
}
