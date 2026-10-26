// SPDX-License-Identifier: EPL-2.0

/**
 * Data structure for storing three (different) values. Each triple is unique, two different instantiations will be
 * unequal, even if filled with the same three objects. The Java class declares no `equals`/`hashCode`, so identity
 * applies and no hash strategy is needed.
 *
 * @typeParam F type of first value
 * @typeParam S type of second value
 * @typeParam T type of third value
 * @see alg.common/src/org/eclipse/elk/alg/common/utils/UniqueTriple.java
 */
export class UniqueTriple<F, S, T> {
  private readonly first: F;
  private readonly second: S;
  private readonly third: T;

  /** Creates a Triple with initial values. These are read-only afterwards. */
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

  toString(): string {
    return `(${String(this.first)}, ${String(this.second)}, ${String(this.third)})`;
  }
}
