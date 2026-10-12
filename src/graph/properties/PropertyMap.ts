// SPDX-License-Identifier: EPL-2.0
import type { IProperty } from './IProperty.js';

/**
 * Read-only view standing in for the Java `Map<IProperty<?>, Object>` returned by
 * `IPropertyHolder.getAllProperties()`. Both property containers (hash-map backed and EMap
 * backed) must satisfy it. Port-specific: Java returns `java.util.Map`.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/properties/IPropertyHolder.java
 */
export interface PropertyMap extends Iterable<[IProperty<unknown>, unknown]> {
  /** Returns the value mapped to the property, or `undefined` if absent. */
  get(property: IProperty<unknown>): unknown | undefined;

  /** Whether a value is mapped to the property. */
  containsKey(property: IProperty<unknown>): boolean;

  /** Whether no property is assigned. */
  isEmpty(): boolean;

  /** Number of assigned properties. */
  size(): number;
}
