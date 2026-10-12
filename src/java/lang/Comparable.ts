// SPDX-License-Identifier: EPL-2.0

/**
 * Java `Comparable`: imposes a natural ordering. Returns a negative number, zero or a positive
 * number as this object is less than, equal to or greater than `other`.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Comparable.html
 */
export interface Comparable<T> {
  compareTo(other: T): number;
}
