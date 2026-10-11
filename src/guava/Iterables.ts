// SPDX-License-Identifier: EPL-2.0
import { IndexOutOfBoundsException } from '../java/lang/IndexOutOfBoundsException.js';
import { NoSuchElementException } from '../java/util/NoSuchElementException.js';

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Iterables.html#concat(java.lang.Iterable...) */
export function concat<T>(...inputs: Iterable<T>[]): Iterable<T> {
  return concatAll(inputs);
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Iterables.html#concat(java.lang.Iterable) */
export function concatAll<T>(inputs: Iterable<Iterable<T>>): Iterable<T> {
  return {
    *[Symbol.iterator](): Iterator<T> {
      for (const input of inputs) {
        yield* input;
      }
    },
  };
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Iterables.html#size(java.lang.Iterable) */
export function size(iterable: Iterable<unknown>): number {
  if (Array.isArray(iterable)) {
    return iterable.length;
  }
  if (iterable instanceof Set || iterable instanceof Map) {
    return iterable.size;
  }
  let count = 0;
  for (const _element of iterable) {
    count++;
  }
  return count;
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Iterables.html#isEmpty(java.lang.Iterable) */
export function isEmpty(iterable: Iterable<unknown>): boolean {
  return iterable[Symbol.iterator]().next().done === true;
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Iterables.html#filter(java.lang.Iterable,com.google.common.base.Predicate) */
export function filter<T>(unfiltered: Iterable<T>, predicate: (element: T) => boolean): Iterable<T> {
  return {
    *[Symbol.iterator](): Iterator<T> {
      for (const element of unfiltered) {
        if (predicate(element)) {
          yield element;
        }
      }
    },
  };
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Iterables.html#transform(java.lang.Iterable,com.google.common.base.Function) */
export function transform<F, T>(fromIterable: Iterable<F>, fn: (from: F) => T): Iterable<T> {
  return {
    *[Symbol.iterator](): Iterator<T> {
      for (const element of fromIterable) {
        yield fn(element);
      }
    },
  };
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Iterables.html#getFirst(java.lang.Iterable,T) */
export function getFirst<T, D>(iterable: Iterable<T>, defaultValue: D): T | D {
  const first = iterable[Symbol.iterator]().next();
  return first.done === true ? defaultValue : first.value;
}

/**
 * Overloads: `getLast(iterable)` throws {@link NoSuchElementException} when empty;
 * `getLast(iterable, defaultValue)` returns the default instead.
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Iterables.html#getLast(java.lang.Iterable)
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Iterables.html#getLast(java.lang.Iterable,T)
 */
export function getLast<T>(iterable: Iterable<T>): T;
export function getLast<T, D>(iterable: Iterable<T>, defaultValue: D): T | D;
export function getLast<T, D>(iterable: Iterable<T>, ...defaultValue: [] | [D]): T | D {
  let found = false;
  let last: T | undefined;
  for (const element of iterable) {
    found = true;
    last = element;
  }
  if (found) {
    return last as T;
  }
  if (defaultValue.length === 0) {
    throw new NoSuchElementException();
  }
  return defaultValue[0];
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Iterables.html#get(java.lang.Iterable,int) */
export function get<T>(iterable: Iterable<T>, position: number): T {
  if (position < 0) {
    throw new IndexOutOfBoundsException(`position (${position}) must not be negative`);
  }
  let skipped = 0;
  for (const element of iterable) {
    if (skipped === position) {
      return element;
    }
    skipped++;
  }
  throw new IndexOutOfBoundsException(
    `position (${position}) must be less than the number of elements that remained (${skipped})`,
  );
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Iterables.html#all(java.lang.Iterable,com.google.common.base.Predicate) */
export function all<T>(iterable: Iterable<T>, predicate: (element: T) => boolean): boolean {
  for (const element of iterable) {
    if (!predicate(element)) {
      return false;
    }
  }
  return true;
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Iterables.html#any(java.lang.Iterable,com.google.common.base.Predicate) */
export function any<T>(iterable: Iterable<T>, predicate: (element: T) => boolean): boolean {
  for (const element of iterable) {
    if (predicate(element)) {
      return true;
    }
  }
  return false;
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/Iterables.html#addAll(java.util.Collection,java.lang.Iterable) */
export function addAll<T>(addTo: T[], elementsToAdd: Iterable<T>): boolean {
  const before = addTo.length;
  for (const element of elementsToAdd) {
    addTo.push(element);
  }
  return addTo.length !== before;
}
