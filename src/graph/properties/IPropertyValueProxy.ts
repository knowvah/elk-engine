// SPDX-License-Identifier: EPL-2.0
import type { IProperty } from './IProperty.js';

/**
 * A proxy object for properties that are resolved lazily.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/properties/IPropertyValueProxy.java
 */
export interface IPropertyValueProxy {
  /**
   * Resolve the value associated with the given property. Returns the corresponding value, or
   * `null` if the value cannot be resolved.
   */
  resolveValue<T>(property: IProperty<T>): T | null;
}
