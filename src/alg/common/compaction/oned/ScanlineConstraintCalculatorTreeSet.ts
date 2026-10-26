// SPDX-License-Identifier: EPL-2.0

/**
 * The part of `java.util.TreeSet` that {@link ScanlineConstraintCalculator} uses: a set ordered by a
 * comparator, where `compare == 0` means "same element", with the navigation methods. Backed by a
 * sorted array and binary search. Written from the JDK 21 Javadoc only (AD-9).
 *
 * The port has no shared live `TreeSet` shim yet (`Sets.newTreeSet` is a snapshot, see
 * `docs/translation-rules-collections.md` section 3); this local class stands in for it. It lives here
 * because mission 6a's write-set is `compaction/oned`.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/TreeSet.html
 */
export class TreeSet<E> {
  readonly #comparator: (a: E, b: E) => number;
  readonly #items: E[] = [];

  constructor(comparator: (a: E, b: E) => number) {
    this.#comparator = comparator;
  }

  /** Adds the element unless a comparator-equal one is present; `false` if it was not added. */
  add(e: E): boolean {
    const index = this.#firstNotBelow(e);
    if (this.#isEqualAt(index, e)) {
      return false;
    }
    this.#items.splice(index, 0, e);
    return true;
  }

  /** Removes the comparator-equal element; `false` if there was none. */
  remove(e: E): boolean {
    const index = this.#firstNotBelow(e);
    if (!this.#isEqualAt(index, e)) {
      return false;
    }
    this.#items.splice(index, 1);
    return true;
  }

  clear(): void {
    this.#items.length = 0;
  }

  /** The greatest element less than or equal to `e`, or `null`. */
  floor(e: E): E | null {
    const index = this.#firstNotBelow(e);
    return this.#isEqualAt(index, e) ? (this.#items[index] as E) : this.#at(index - 1);
  }

  /** The least element greater than or equal to `e`, or `null`. */
  ceiling(e: E): E | null {
    return this.#at(this.#firstNotBelow(e));
  }

  /** The greatest element strictly less than `e`, or `null`. */
  lower(e: E): E | null {
    return this.#at(this.#firstNotBelow(e) - 1);
  }

  /** The least element strictly greater than `e`, or `null`. */
  higher(e: E): E | null {
    const index = this.#firstNotBelow(e);
    return this.#at(this.#isEqualAt(index, e) ? index + 1 : index);
  }

  #at(index: number): E | null {
    return index >= 0 && index < this.#items.length ? (this.#items[index] as E) : null;
  }

  #isEqualAt(index: number, e: E): boolean {
    return index < this.#items.length && this.#comparator(this.#items[index] as E, e) === 0;
  }

  /** Index of the first element that is not less than `e` (`items.length` if none). */
  #firstNotBelow(e: E): number {
    let low = 0;
    let high = this.#items.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.#comparator(this.#items[mid] as E, e) < 0) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low;
  }
}
