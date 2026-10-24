// SPDX-License-Identifier: EPL-2.0
import { add, mul } from '../../java/lang/Int32.js';
import { ClassCastException } from '../../java/lang/ClassCastException.js';
import * as JavaObjects from '../../java/util/JavaObjects.js';

const HASH_MULTIPLIER = 31;
const HASH_SEED = 1;

/**
 * A simple Quadruple class holding four values. The values are read-only after construction.
 *
 * @param <A> type of the first value
 * @param <B> type of the second value
 * @param <C> type of the third value
 * @param <D> type of the fourth value
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/Quadruple.java
 */
export class Quadruple<A, B, C, D> {
  private first: A;
  private second: B;
  private third: C;
  private fourth: D;

  /**
   * Creates a Quadruple with initial values. These are read-only afterwards.
   *
   * @param a First value
   * @param b Second value
   * @param c Third value
   * @param d Fourth value
   */
  constructor(a: A, b: B, c: C, d: D) {
    this.first = a;
    this.second = b;
    this.third = c;
    this.fourth = d;
  }

  /** @returns The first value */
  getFirst(): A {
    return this.first;
  }

  /** @returns The second value */
  getSecond(): B {
    return this.second;
  }

  /** @returns The third value */
  getThird(): C {
    return this.third;
  }

  /** @returns The fourth value */
  getFourth(): D {
    return this.fourth;
  }

  /** `Objects.hash(first, second, third, fourth)`, i.e. `Arrays.hashCode` of the members. */
  hashCode(): number {
    let result = HASH_SEED;
    for (const member of [this.first, this.second, this.third, this.fourth]) {
      result = add(mul(HASH_MULTIPLIER, result), JavaObjects.hashCode(member));
    }
    return result;
  }

  /** Casts without an instance check, as Java does: a non-Quadruple throws a `ClassCastException`. */
  equals(obj: unknown): boolean {
    if (!(obj instanceof Quadruple)) {
      throw new ClassCastException('Cannot cast to Quadruple');
    }
    const other = obj as Quadruple<unknown, unknown, unknown, unknown>;
    return (
      JavaObjects.equals(this.first, other.getFirst()) &&
      JavaObjects.equals(this.second, other.getSecond()) &&
      JavaObjects.equals(this.third, other.getThird()) &&
      JavaObjects.equals(this.fourth, other.getFourth())
    );
  }

  toString(): string {
    const parts = [this.first, this.second, this.third, this.fourth].map((m) => JavaObjects.toString(m));
    return `(${parts.join(', ')})`;
  }
}
