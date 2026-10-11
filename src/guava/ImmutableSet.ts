// SPDX-License-Identifier: EPL-2.0
import { UnsupportedOperationException } from "../java/lang/UnsupportedOperationException.js";

const REJECT_MESSAGE = "ImmutableSet is read-only";

/**
 * An insertion-ordered set whose mutators throw `UnsupportedOperationException` (M5).
 * Elements are filled through the prototype `add`, so the `Set` constructor never reaches
 * the throwing overrides.
 *
 * @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/ImmutableSet.html
 */
export class ImmutableSet<E> extends Set<E> {
  constructor(elements: Iterable<E>) {
    super();
    let index = 0;
    for (const element of elements) {
      if (element === null || element === undefined) {
        throw new TypeError(`null element at index ${index}`);
      }
      Set.prototype.add.call(this, element);
      index++;
    }
  }

  override add(_value: E): never {
    throw new UnsupportedOperationException(REJECT_MESSAGE);
  }

  override delete(_value: E): never {
    throw new UnsupportedOperationException(REJECT_MESSAGE);
  }

  override clear(): never {
    throw new UnsupportedOperationException(REJECT_MESSAGE);
  }
}

/** @see https://guava.dev/releases/33.3.0-jre/api/docs/com/google/common/collect/ImmutableSet.html#copyOf(java.util.Collection) */
export function copyOf<E>(elements: Iterable<E>): ImmutableSet<E> {
  return new ImmutableSet(elements);
}

/** Varargs form: `of()`, `of(e1)`, `of(e1, e2)`, ... Duplicates are dropped, first wins. */
export function of<E>(...elements: E[]): ImmutableSet<E> {
  return new ImmutableSet(elements);
}
