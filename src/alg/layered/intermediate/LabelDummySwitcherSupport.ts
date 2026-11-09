// SPDX-License-Identifier: EPL-2.0
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';

/**
 * Java's `iterable.iterator().next()`: the first element, or a `NoSuchElementException` on an empty iterable.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/LabelDummySwitcher.java:393
 */
export function firstOf<T>(iterable: Iterable<T>): T {
  const next = iterable[Symbol.iterator]().next();
  if (next.done === true) {
    throw new NoSuchElementException();
  }
  return next.value;
}
