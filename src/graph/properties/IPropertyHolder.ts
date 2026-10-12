// SPDX-License-Identifier: EPL-2.0
import type { IProperty } from './IProperty.js';
import type { PropertyMap } from './PropertyMap.js';

/**
 * Interface for holders of property values.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/properties/IPropertyHolder.java
 */
export interface IPropertyHolder {
  /**
   * Sets a property value. No type checking is performed while setting, so users of this method
   * must take care that the right object types are generated. A `null` value removes the
   * property (Java semantics). Java `IProperty<? super T>` is simplified to `IProperty<T>`.
   *
   * @returns `this` holder for convenience
   */
  setProperty<T>(property: IProperty<T>, value: T | null): IPropertyHolder;

  /**
   * Retrieves a property value. If the property is not set, its default value shall be taken,
   * which is taken from the given property instance. May be `null` when the default is `null`.
   */
  getProperty<T>(property: IProperty<T>): T;

  /**
   * Checks whether a value is configured for the given property. If not, the next call to
   * `getProperty` will return the property's default value and set the property's value to the
   * default value for this property holder, provided that the default value is not `null`.
   * After that, the property value is set and thus all further calls to `hasProperty` will
   * return `true` for that property.
   */
  hasProperty(property: IProperty<unknown>): boolean;

  /**
   * Copy all properties from another property holder to this one.
   *
   * @returns `this` holder for convenience
   */
  copyProperties(holder: IPropertyHolder | null): IPropertyHolder;

  /** Returns a map of all assigned properties with associated values. */
  getAllProperties(): PropertyMap;
}
