// SPDX-License-Identifier: EPL-2.0
import type { Comparable } from '../../java/lang/Comparable.js';

/**
 * Interface for property identifiers. Properties have a type and a default value, and they have
 * an internal mechanism for identification, which should be compatible with their equality
 * (by id in this port).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/properties/IProperty.java
 */
export interface IProperty<T> {
  /**
   * Returns the default value of this property. If the default value is cloneable, this method
   * should return a clone to allow clients to modify it without messing with the original.
   * Returns `null` if the property has no default value.
   */
  getDefault(): T;

  /** Returns an identifier string for this property. */
  getId(): string;

  /**
   * Returns the lower bound of this property. If there is no lower bound, a comparable is
   * returned that is smaller than everything else. Java `Comparable<? super T>` is simplified to
   * `Comparable<T>` (TypeScript has no lower-bounded wildcards).
   */
  getLowerBound(): Comparable<T>;

  /**
   * Returns the upper bound of this property. If there is no upper bound, a comparable is
   * returned that is greater than everything else. Java `Comparable<? super T>` is simplified to
   * `Comparable<T>`.
   */
  getUpperBound(): Comparable<T>;
}
