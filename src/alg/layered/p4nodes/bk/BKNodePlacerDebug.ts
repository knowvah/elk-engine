// SPDX-License-Identifier: EPL-2.0
import * as JavaObjects from '../../../../java/util/JavaObjects.js';

/** `String.valueOf` of a possibly-`null` element, as Java's collection `toString`s print it. */
function elementToString(element: unknown): string {
  return JavaObjects.toString(element ?? null);
}

/**
 * `AbstractCollection.toString` of a Java `List`/`Set`: `[a, b]` (and `[]` when empty), elements by their own
 * `toString` and `null` for `null`. Used by the `monitor.log` strings of `BKNodePlacer` (N8).
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/AbstractCollection.html#toString()
 */
export function collectionToString(collection: Iterable<unknown>): string {
  return `[${Array.from(collection, elementToString).join(', ')}]`;
}

/**
 * `AbstractMap.toString` of a Java `Map` whose values are lists: `{k=[a, b], k2=[c]}` (and `{}` when empty).
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/AbstractMap.html#toString()
 */
export function mapToString(map: ReadonlyMap<unknown, Iterable<unknown>>): string {
  const entries = Array.from(map, ([key, value]) => `${elementToString(key)}=${collectionToString(value)}`);
  return `{${entries.join(', ')}}`;
}
