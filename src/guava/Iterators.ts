// SPDX-License-Identifier: EPL-2.0

/** Constructor type usable with `instanceof`, including abstract classes. */
export type ClassOf<T> = abstract new (...args: never[]) => T;

function* filterGen<T>(
  unfiltered: Iterator<T>,
  predicate: (element: T) => boolean,
): Generator<T, void, undefined> {
  for (let r = unfiltered.next(); r.done !== true; r = unfiltered.next()) {
    if (predicate(r.value)) {
      yield r.value;
    }
  }
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Iterators.html#filter(java.util.Iterator,com.google.common.base.Predicate) */
export function filter<T>(
  unfiltered: Iterator<T>,
  predicate: (element: T) => boolean,
): IterableIterator<T> {
  return filterGen(unfiltered, predicate);
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Iterators.html#filter(java.util.Iterator,java.lang.Class) */
export function filterInstances<T>(
  unfiltered: Iterator<unknown>,
  desiredClass: ClassOf<T>,
): IterableIterator<T> {
  return filterGen(
    unfiltered,
    (element): boolean => element instanceof desiredClass,
  ) as IterableIterator<T>;
}

function* concatGen<T>(inputs: Iterator<T>[]): Generator<T, void, undefined> {
  for (const input of inputs) {
    for (let r = input.next(); r.done !== true; r = input.next()) {
      yield r.value;
    }
  }
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Iterators.html#concat(java.util.Iterator...) */
export function concat<T>(...inputs: Iterator<T>[]): IterableIterator<T> {
  return concatGen(inputs);
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Iterators.html#singletonIterator(T) */
export function singletonIterator<T>(value: T): IterableIterator<T> {
  return concatGen([[value][Symbol.iterator]()]);
}

class UnmodifiableIterator<T> implements Iterator<T> {
  readonly #delegate: Iterator<T>;

  constructor(delegate: Iterator<T>) {
    this.#delegate = delegate;
  }

  next(): IteratorResult<T> {
    return this.#delegate.next();
  }
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Iterators.html#unmodifiableIterator(java.util.Iterator) */
export function unmodifiableIterator<T>(iterator: Iterator<T>): Iterator<T> {
  return new UnmodifiableIterator(iterator);
}
