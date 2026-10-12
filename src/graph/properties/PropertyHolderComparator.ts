// SPDX-License-Identifier: EPL-2.0
import * as DoubleCompare from '../../java/lang/DoubleCompare.js';
import type { Comparable } from '../../java/lang/Comparable.js';
import type { IProperty } from './IProperty.js';
import type { IPropertyHolder } from './IPropertyHolder.js';
import { compareStrings } from './Property.js';

/**
 * The values `T extends Comparable<T>` can take here: a `Comparable`, or one of the JS primitives that
 * stand for the Java `Integer`/`Double`/`String`/`Boolean` (which are `Comparable` in Java).
 */
export type NaturallyOrdered<T> = Comparable<T> | number | string | boolean;

/** `Comparable.compareTo` for {@link NaturallyOrdered} values: `Double.compare`, `String.compareTo`, `Boolean.compare`. */
function compareNaturally(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') {
    return DoubleCompare.compare(a, b);
  }
  if (typeof a === 'string' && typeof b === 'string') {
    return compareStrings(a, b);
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }
  return (a as Comparable<unknown>).compareTo(b);
}

/**
 * A comparator for property holders that can uses a specific property for comparison. Java
 * `Comparator<IPropertyHolder>` is the function type `(a, b) => number`, returned by {@link with}.
 *
 * @author msp
 * @param <T> the type of the property used for comparison
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/properties/PropertyHolderComparator.java
 */
export class PropertyHolderComparator<T extends NaturallyOrdered<T>> {
  /**
   * Create a property holder comparator for the given property.
   *
   * @param property a property
   * @param <U> the property type
   * @return a comparator that considers the given property
   */
  static with<U extends NaturallyOrdered<U>>(
    property: IProperty<U>,
  ): (ph1: IPropertyHolder, ph2: IPropertyHolder) => number {
    const comparator = new PropertyHolderComparator<U>(property);
    return (ph1, ph2) => comparator.compare(ph1, ph2);
  }

  /** the property used for comparing. */
  private readonly property: IProperty<T>;

  /**
   * Create a property holder comparator for the given property.
   *
   * @param property a property
   */
  private constructor(property: IProperty<T>) {
    this.property = property;
  }

  compare(ph1: IPropertyHolder, ph2: IPropertyHolder): number {
    const p1 = ph1.getProperty(this.property);
    const p2 = ph2.getProperty(this.property);
    if (p1 !== null && p2 !== null) {
      return compareNaturally(p1, p2);
    } else if (p1 !== null) {
      return -1;
    } else if (p2 !== null) {
      return 1;
    } else {
      return 0;
    }
  }
}
