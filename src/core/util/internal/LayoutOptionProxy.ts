// SPDX-License-Identifier: EPL-2.0
import { LayoutMetaDataService } from '../../data/LayoutMetaDataService.js';
import { LayoutOptionData } from '../../data/LayoutOptionData.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import type { IPropertyHolder } from '../../../graph/properties/IPropertyHolder.js';
import type { IPropertyValueProxy } from '../../../graph/properties/IPropertyValueProxy.js';
import { Property } from '../../../graph/properties/Property.js';
import * as JavaString from '../../../java/lang/JavaString.js';

/**
 * A proxy class for lazy resolving of layout options.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/internal/LayoutOptionProxy.java
 */
export class LayoutOptionProxy implements IPropertyValueProxy {
  /** the serialized layout option value. */
  private readonly value: string | null;

  /**
   * Create a layout option proxy for the given value.
   *
   * @param value the serialized layout option value
   */
  constructor(value: string | null) {
    this.value = value;
  }

  /**
   * Create a layout option proxy with given key and value strings.
   *
   * @param propertyHolder the property holder in which to store the new value
   * @param key the layout option identifier string
   * @param value the serialized value
   */
  static setProxyValue(propertyHolder: IPropertyHolder, key: string, value: string | null): void {
    const property: IProperty<LayoutOptionProxy> = new Property<LayoutOptionProxy>(key);
    const proxy = new LayoutOptionProxy(value);
    propertyHolder.setProperty(property, proxy);
  }

  resolveValue<T>(property: IProperty<T> | null): T | null {
    if (property !== null && property !== undefined) {
      const optionData =
        property instanceof LayoutOptionData
          ? property
          : LayoutMetaDataService.getInstance().getOptionData(property.getId());

      if (optionData !== null) {
        // unchecked cast, as in Java: TypeScript cannot verify that the parsed value matches T
        return optionData.parseValue(this.value) as T | null;
      }
    }

    return null;
  }

  toString(): string | null {
    return this.value;
  }

  equals(object: unknown): boolean {
    if (object instanceof LayoutOptionProxy) {
      return this.value === object.value;
    }
    return false;
  }

  hashCode(): number {
    if (this.value !== null) {
      return JavaString.hashCode(this.value);
    }
    return 0;
  }
}
