// SPDX-License-Identifier: EPL-2.0
import { add, mul } from '../../java/lang/Int32.js';
import { ClassCastException } from '../../java/lang/ClassCastException.js';
import * as JavaObjects from '../../java/util/JavaObjects.js';

const HASH_MULTIPLIER = 31;
const HASH_SEED = 1;

/**
 * A simple Triple class holding three values. The values are read-only after construction.
 *
 * @param <F> type of the first value
 * @param <S> type of the second value
 * @param <T> type of the third value
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/Triple.java
 */
export class Triple<F, S, T> {
  private first: F;
  private second: S;
  private third: T;

  /**
   * Creates a Triple with initial values. These are read-only afterwards.
   *
   * @param f First value
   * @param s Second value
   * @param t Third value
   */
  constructor(f: F, s: S, t: T) {
    this.first = f;
    this.second = s;
    this.third = t;
  }

  /** @returns The first value */
  getFirst(): F {
    return this.first;
  }

  /** @returns The second value */
  getSecond(): S {
    return this.second;
  }

  /** @returns The third value */
  getThird(): T {
    return this.third;
  }

  /** `Objects.hash(first, second, third)`, i.e. `Arrays.hashCode` of the members. */
  hashCode(): number {
    let result = HASH_SEED;
    for (const member of [this.first, this.second, this.third]) {
      result = add(mul(HASH_MULTIPLIER, result), JavaObjects.hashCode(member));
    }
    return result;
  }

  /** Casts without an instance check, as Java does: a non-Triple throws a `ClassCastException`. */
  equals(obj: unknown): boolean {
    if (!(obj instanceof Triple)) {
      throw new ClassCastException('Cannot cast to Triple');
    }
    const other = obj as Triple<unknown, unknown, unknown>;
    return (
      JavaObjects.equals(this.first, other.getFirst()) &&
      JavaObjects.equals(this.second, other.getSecond()) &&
      JavaObjects.equals(this.third, other.getThird())
    );
  }

  toString(): string {
    return `(${JavaObjects.toString(this.first)}, ${JavaObjects.toString(this.second)}, ${JavaObjects.toString(this.third)})`;
  }
}
