// SPDX-License-Identifier: EPL-2.0
import { IndexOutOfBoundsException } from '../../java/lang/IndexOutOfBoundsException.js';

/**
 * `java.util.ArrayList` operations of `InteractiveLayeredGraphVisitor` over a JS array, with the Java index checks (a
 * JS `splice(-1, 0, x)` would insert where Java's `add(-1, x)` throws). Elements are compared by identity (`equals` of
 * an `ElkNode` is identity); `null` is a legal element to look for, as in `ArrayList.contains(null)`.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayList.html
 */

/** `list.get(index)`. @throws IndexOutOfBoundsException when `index` is outside `0..size-1` */
export function get<T>(list: readonly T[], index: number): T {
  if (index < 0 || index >= list.length) {
    throw new IndexOutOfBoundsException(`Index ${String(index)} out of bounds for length ${String(list.length)}`);
  }
  return list[index] as T;
}

/** `list.contains(element)`. */
export function contains<T>(list: readonly T[], element: T | null): boolean {
  return list.some((candidate) => candidate === element);
}

/** `list.indexOf(element)`. */
export function indexOf<T>(list: readonly T[], element: T | null): number {
  return list.findIndex((candidate) => candidate === element);
}

function checkAddIndex(size: number, index: number): void {
  if (index < 0 || index > size) {
    throw new IndexOutOfBoundsException(`Index: ${String(index)}, Size: ${String(size)}`);
  }
}

/** `list.add(index, element)`. @throws IndexOutOfBoundsException when `index` is outside `0..size` */
export function addAt<T>(list: T[], index: number, element: T): void {
  checkAddIndex(list.length, index);
  list.splice(index, 0, element);
}

/** `list.addAll(index, elements)`. @throws IndexOutOfBoundsException when `index` is outside `0..size` */
export function addAllAt<T>(list: T[], index: number, elements: readonly T[]): void {
  checkAddIndex(list.length, index);
  list.splice(index, 0, ...elements);
}

/** `list.remove(index)`. @throws IndexOutOfBoundsException when `index` is outside `0..size-1` */
export function removeAt<T>(list: T[], index: number): T {
  const element = get(list, index);
  list.splice(index, 1);
  return element;
}

/** `list.remove(Object)`: removes the first occurrence. */
export function remove<T>(list: T[], element: T | null): boolean {
  const index = indexOf(list, element);
  if (index < 0) {
    return false;
  }
  list.splice(index, 1);
  return true;
}

/** `list.removeAll(other)`: removes every element that `other` contains, keeping the order of the rest. */
export function removeAll<T>(list: T[], other: readonly T[]): boolean {
  const kept = list.filter((element) => !contains(other, element));
  const changed = kept.length !== list.length;
  list.splice(0, list.length, ...kept);
  return changed;
}
