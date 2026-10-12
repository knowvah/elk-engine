// SPDX-License-Identifier: EPL-2.0
import type { Comparable } from '../../java/lang/Comparable.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import * as JavaString from '../../java/lang/JavaString.js';
import { ElkReflect } from '../util/ElkReflect.js';
import type { IProperty } from './IProperty.js';

/**
 * Type guard for the Java `instanceof IProperty<?>` test (TypeScript interfaces vanish at run
 * time): an object with a `getId` function.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/properties/Property.java
 */
export function isIProperty(o: unknown): o is IProperty<unknown> {
  return typeof o === 'object' && o !== null && 'getId' in o && typeof o.getId === 'function';
}

/**
 * Definition of a property that can be set on an {@link IPropertyHolder}. A property is described
 * by its identifier, which is a String. Properties may have a default value which is returned by
 * a property holder if the property is not set on it. Properties may also define lower and upper
 * bounds that restrict which values are considered legal.
 *
 * The five Java constructors are one constructor with optional parameters, except
 * `Property(IProperty<T> other, T defaultValue)`, which clashes by arity with
 * `Property(String id, T defaultValue)` at run time and is {@link Property.withDefault}.
 *
 * @param <T> type of the property
 * @author msp
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/properties/Property.java
 */
export class Property<T> implements IProperty<T>, Comparable<IProperty<unknown>> {
  // Declared before the instance fields (Java declares them last): TypeScript rejects a field
  // initializer that reads a static declared later.
  /** the default lower bound, which is smaller than everything else. */
  static readonly NEGATIVE_INFINITY: Comparable<unknown> & { toString(): string } = {
    compareTo: (_other: unknown): number => -1,
    toString: (): string => '-∞',
  };

  /** the default upper bound, which is greater than everything else. */
  static readonly POSITIVE_INFINITY: Comparable<unknown> & { toString(): string } = {
    compareTo: (_other: unknown): number => 1,
    toString: (): string => '+∞',
  };

  /** identifier of this property. */
  private readonly id: string;
  /** the default value of this property. */
  private defaultValue: T;
  /** the lower bound of this property. */
  private lowerBound: Comparable<T> = Property.NEGATIVE_INFINITY;
  /** the upper bound of this property. */
  private upperBound: Comparable<T> = Property.POSITIVE_INFINITY;

  /**
   * Creates a property with given identifier, default value, and lower and upper bound. Covers the
   * Java constructors `Property(id)` (default value `null`), `Property(id, defaultValue)`,
   * `Property(id, defaultValue, lowerBound)` and `Property(id, defaultValue, lowerBound, upperBound)`.
   *
   * @param id the identifier
   * @param defaultValue the default value, `null` if omitted
   * @param lowerBound the lower bound, or `null` if the default lower bound shall be taken
   * @param upperBound the upper bound, or `null` if the default upper bound shall be taken
   */
  constructor(id: string, defaultValue?: T, lowerBound?: Comparable<T> | null, upperBound?: Comparable<T> | null) {
    this.id = id;
    this.defaultValue = (defaultValue ?? null) as T;
    if (lowerBound !== undefined && lowerBound !== null) {
      this.lowerBound = lowerBound;
    }
    if (upperBound !== undefined && upperBound !== null) {
      this.upperBound = upperBound;
    }
  }

  /**
   * Creates a property using another property as identifier, but changing the default value
   * (Java constructor `Property(IProperty<T> other, T defaultValue)`).
   *
   * @param other another property
   * @param defaultValue the new default value
   */
  static withDefault<T>(other: IProperty<T>, defaultValue: T): Property<T> {
    return new Property<T>(other.getId(), defaultValue);
  }

  equals(obj: unknown): boolean {
    if (isIProperty(obj)) {
      return this.id === obj.getId();
    } else {
      return false;
    }
  }

  hashCode(): number {
    return JavaString.hashCode(this.id);
  }

  toString(): string {
    return this.id;
  }

  /**
   * Returns the default value of this property.
   *
   * @return the default value.
   */
  getDefault(): T {
    // Clone the default value if it's a Cloneable. One would have to use reflection for this to work
    // properly (classes implementing Cloneable are not required to make their clone() method
    // public, so we need to check if they have such a method and invoke it via reflection, which
    // results in ugly and unchecked type casting)
    // HOWEVER, since GWT doesn't support reflection, a helper class is used that is able to clone
    // those objects that are viable as property values
    if (ElkReflect.isCloneable(this.defaultValue)) {
      const clone = ElkReflect.clone(this.defaultValue);
      if (clone === null) {
        throw new IllegalStateException(
          `Couldn't clone property '${this.id}'. ` +
            'Make sure its type is registered with the ElkReflect utility class.',
        );
      }
      return clone;
    } else {
      return this.defaultValue;
    }
  }

  getId(): string {
    return this.id;
  }

  getLowerBound(): Comparable<T> {
    return this.lowerBound;
  }

  getUpperBound(): Comparable<T> {
    return this.upperBound;
  }

  compareTo(other: IProperty<unknown>): number {
    return JavaString.compareTo(this.id, other.getId());
  }
}
