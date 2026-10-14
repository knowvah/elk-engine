// SPDX-License-Identifier: EPL-2.0
import type { Comparable } from '../../java/lang/Comparable.js';
import * as JavaObjects from '../../java/util/JavaObjects.js';

const HALF_WORD = 16;
const MASK1 = (1 << HALF_WORD) - 1;
const MASK2 = ~MASK1;

/**
 * Comparator that uses the first element as base.
 *
 * @param <F> comparable type of first pair element.
 * @param <S> type of second pair element.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/Pair.java
 */
class FirstComparator<F extends Comparable<F>, S> {
  compare(o1: Pair<F, S>, o2: Pair<F, S>): number {
    return (o1.getFirst() as F).compareTo(o2.getFirst() as F);
  }
}

/**
 * Comparator that uses the second element as base.
 *
 * @param <F> type of first pair element.
 * @param <S> comparable type of second pair element.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/Pair.java
 */
class SecondComparator<F, S extends Comparable<S>> {
  compare(o1: Pair<F, S>, o2: Pair<F, S>): number {
    return (o1.getSecond() as S).compareTo(o2.getSecond() as S);
  }
}

/**
 * A useful pair implementation. Elements are `null` when unset, as the Java fields are.
 *
 * The three Java constructors are one: no argument, `(first, second)`, or a single map entry (a
 * `[key, value]` tuple, the shape of `Maps` entries), told apart by argument count (6.5). The
 * Java `Iterable<Object>` is `[Symbol.iterator]`; the `Iterator.remove` that always throws is
 * not reachable through a JavaScript iterator. `Serializable` is dropped.
 *
 * @param <F> type of first contained object
 * @param <S> type of second contained object
 * @author msp
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/Pair.java
 */
export class Pair<F, S> implements Iterable<unknown> {
  /** Comparator that uses the first element as base. */
  static readonly FirstComparator: typeof FirstComparator = FirstComparator;
  /** Comparator that uses the second element as base. */
  static readonly SecondComparator: typeof SecondComparator = SecondComparator;

  /** the first element. */
  private first: F | null = null;
  /** the second element. */
  private second: S | null = null;

  /** Constructs a pair with `null` elements. */
  constructor();
  /** Constructs a pair given both elements. */
  constructor(first: F, second: S);
  /** Constructs a pair from a map entry. */
  constructor(entry: readonly [F, S]);
  constructor(...args: [] | [F, S] | [readonly [F, S]]) {
    if (args.length === 2) {
      this.first = args[0];
      this.second = args[1];
    } else if (args.length === 1) {
      this.first = args[0][0];
      this.second = args[0][1];
    }
  }

  /**
   * Constructs a pair with `null` elements.
   *
   * @returns a new pair
   */
  static create<T1, T2>(): Pair<T1, T2> {
    return new Pair<T1, T2>();
  }

  /**
   * Constructs a pair given both elements.
   *
   * @param first the first element
   * @param second the second element
   * @returns a new pair
   */
  static of<T1, T2>(first: T1, second: T2): Pair<T1, T2> {
    return new Pair<T1, T2>(first, second);
  }

  /**
   * Constructs a list of pairs from the entries of a map.
   *
   * @param map a map
   * @returns a list of map entries as pairs
   */
  static fromMap<G, T>(map: ReadonlyMap<G, T>): Array<Pair<G, T>> {
    const list: Array<Pair<G, T>> = [];
    for (const entry of map.entries()) {
      list.push(new Pair<G, T>(entry));
    }
    return list;
  }

  equals(obj: unknown): boolean {
    if (obj instanceof Pair) {
      const other = obj as Pair<unknown, unknown>;
      return JavaObjects.equals(this.first, other.first) && JavaObjects.equals(this.second, other.second);
    }
    return false;
  }

  hashCode(): number {
    const firstCode = JavaObjects.hashCode(this.first);
    const first1 = firstCode & MASK1;
    const first2 = firstCode & MASK2;
    const secondCode = JavaObjects.hashCode(this.second);
    const second1 = secondCode & MASK1;
    const second2 = secondCode & MASK2;
    return (first1 ^ ((second2 >> HALF_WORD) & MASK1)) | (first2 ^ (second1 << HALF_WORD));
  }

  toString(): string {
    return `pair(${JavaObjects.toString(this.first)},${JavaObjects.toString(this.second)})`;
  }

  /** @param thefirst the first element to set */
  setFirst(thefirst: F | null): void {
    this.first = thefirst;
  }

  /** @returns the first element */
  getFirst(): F | null {
    return this.first;
  }

  /** @param thesecond the second element to set */
  setSecond(thesecond: S | null): void {
    this.second = thesecond;
  }

  /** @returns the second element */
  getSecond(): S | null {
    return this.second;
  }

  /** Iterates over the non-null elements, first before second. */
  *[Symbol.iterator](): Iterator<unknown> {
    if (this.first !== null) {
      yield this.first;
    }
    if (this.second !== null) {
      yield this.second;
    }
  }

  /** Clear any contained object, both the first and the second. */
  clear(): void {
    this.first = null;
    this.second = null;
  }
}
