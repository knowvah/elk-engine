// SPDX-License-Identifier: EPL-2.0
import { compare as compareDoubles } from "../java/lang/DoubleCompare.js";
import { IllegalArgumentException } from "../java/lang/IllegalArgumentException.js";
import { copyOf } from "./ImmutableSet.js";
import type { ImmutableSet } from "./ImmutableSet.js";

const VIEW_MESSAGE = "SetView is unmodifiable";

/** Java `Comparator`: negative, zero or positive like `compare(a, b)`. */
export type Comparator<E> = (a: E, b: E) => number;

/** Java `Comparable` stand-in: numbers, bigints, strings, or objects with `compareTo`. */
export type NaturallyOrdered = number | bigint | string | { compareTo(other: never): number };

/** Elements of a Java enum in this port expose their declaration index as `ordinal()`. */
export interface Ordinal {
  ordinal(): number;
}

/**
 * Live, unmodifiable view of the intersection of two sets. Iteration follows the first set;
 * every read re-consults both backing sets. Mutators throw `TypeError` (as JS does for frozen objects).
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Sets.SetView.html
 */
export class SetView<E> implements ReadonlySet<E> {
  readonly #first: ReadonlySet<E>;
  readonly #second: ReadonlySet<unknown>;

  constructor(first: ReadonlySet<E>, second: ReadonlySet<unknown>) {
    this.#first = first;
    this.#second = second;
  }

  get size(): number {
    let count = 0;
    for (const _element of this) {
      count++;
    }
    return count;
  }

  has(value: E): boolean {
    return this.#first.has(value) && this.#second.has(value);
  }

  *[Symbol.iterator](): IterableIterator<E> {
    for (const element of this.#first) {
      if (this.#second.has(element)) {
        yield element;
      }
    }
  }

  values(): IterableIterator<E> {
    return this[Symbol.iterator]();
  }

  keys(): IterableIterator<E> {
    return this[Symbol.iterator]();
  }

  *entries(): IterableIterator<[E, E]> {
    for (const element of this) {
      yield [element, element];
    }
  }

  forEach(callback: (value: E, value2: E, set: ReadonlySet<E>) => void, thisArg?: unknown): void {
    for (const element of this) {
      callback.call(thisArg, element, element, this);
    }
  }

  add(_value: E): never {
    throw new TypeError(VIEW_MESSAGE);
  }

  delete(_value: E): never {
    throw new TypeError(VIEW_MESSAGE);
  }

  clear(): never {
    throw new TypeError(VIEW_MESSAGE);
  }
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Sets.html#intersection(java.util.Set,java.util.Set) */
export function intersection<E>(set1: ReadonlySet<E>, set2: ReadonlySet<unknown>): SetView<E> {
  return new SetView(set1, set2);
}

function byOrdinal(a: Ordinal, b: Ordinal): number {
  return a.ordinal() - b.ordinal();
}

/**
 * Frozen set in enum declaration (ordinal) order, duplicates removed. Elements must expose
 * `ordinal()`.
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Sets.html#immutableEnumSet(java.lang.Iterable)
 */
export function immutableEnumSet<E extends Ordinal>(elements: Iterable<E>): ImmutableSet<E> {
  return copyOf([...new Set(elements)].sort(byOrdinal));
}

/**
 * The varargs overload `immutableEnumSet(E anElement, E... otherElements)`, named apart
 * because a JS call cannot be overloaded on `Iterable` versus an element.
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Sets.html#immutableEnumSet(E,E...)
 */
export function immutableEnumSetOf<E extends Ordinal>(anElement: E, ...otherElements: E[]): ImmutableSet<E> {
  return immutableEnumSet([anElement, ...otherElements]);
}

/**
 * Mutable insertion-ordered set (a JS `Set` already iterates in insertion order).
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Sets.html#newLinkedHashSet(java.lang.Iterable)
 */
export function newLinkedHashSet<E>(elements: Iterable<E> = []): Set<E> {
  return new Set(elements);
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Sets.html#newLinkedHashSetWithExpectedSize(int) */
export function newLinkedHashSetWithExpectedSize<E>(expectedSize: number): Set<E> {
  if (expectedSize < 0) {
    throw new IllegalArgumentException(`expectedSize cannot be negative but was: ${expectedSize}`);
  }
  return new Set<E>();
}

function naturalOrder(a: unknown, b: unknown): number {
  if (typeof a === "number") {
    return compareDoubles(a, b as number);
  }
  if (typeof a === "string" || typeof a === "bigint") {
    return a < (b as typeof a) ? -1 : a > (b as typeof a) ? 1 : 0;
  }
  if (typeof a === "object" && a !== null && "compareTo" in a && typeof a.compareTo === "function") {
    return (a.compareTo as (other: unknown) => number)(b);
  }
  throw new TypeError("Element has no natural ordering: expected number, bigint, string or compareTo()");
}

function sortedSet<E>(elements: Iterable<E>, comparator: Comparator<E>): Set<E> {
  const sorted = [...elements].sort(comparator);
  const result = new Set<E>();
  let last: E | undefined;
  sorted.forEach((element, index) => {
    // TreeSet.add keeps the existing element when the comparator says "equal"; the sort is stable.
    if (index === 0 || comparator(last as E, element) !== 0) {
      result.add(element);
      last = element;
    }
  });
  return result;
}

/**
 * Sorted set SNAPSHOT: the elements ordered by natural order (`newTreeSet()` /
 * `newTreeSet(elements)`), by `comparator` (`newTreeSet(comparator)` is empty;
 * `newTreeSet(elements, comparator)` is filled), with comparator-equal duplicates dropped
 * (first wins, as `TreeSet.add`; `-0` and `0` collapse because a JS `Set` uses SameValueZero). The result is a plain insertion-ordered `Set`: elements
 * added later are NOT kept sorted and there is no `first`/`lower`/`higher`. Callers that
 * mutate or navigate the set need a real `TreeSet` shim.
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Sets.html#newTreeSet(java.lang.Iterable)
 */
export function newTreeSet<E extends NaturallyOrdered>(elements?: Iterable<E>): Set<E>;
export function newTreeSet<E>(comparator: Comparator<E>): Set<E>;
export function newTreeSet<E>(elements: Iterable<E>, comparator: Comparator<E>): Set<E>;
export function newTreeSet<E>(
  first: Iterable<E> | Comparator<E> = [],
  comparator: Comparator<E> = naturalOrder,
): Set<E> {
  return typeof first === "function" ? sortedSet<E>([], first) : sortedSet(first, comparator);
}
