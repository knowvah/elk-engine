// SPDX-License-Identifier: EPL-2.0
import * as JavaString from '../../java/lang/JavaString.js';
import type { HashStrategy } from '../../java/util/HashStrategy.js';
import { JavaHashMap } from '../../java/util/JavaHashMap.js';
import { ElkReflect } from '../util/ElkReflect.js';
import type { IProperty } from './IProperty.js';
import type { IPropertyHolder } from './IPropertyHolder.js';
import type { IPropertyValueProxy } from './IPropertyValueProxy.js';
import type { PropertyMap } from './PropertyMap.js';

/**
 * The key protocol of the property map: `IProperty` equality is by id (decision D5), so the hash is
 * `String.hashCode` of the id. No `compare` is given: `Property` is `Comparable<IProperty<?>>`, not
 * `Comparable` of itself, which is the condition under which `HashMap` uses comparison order.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/properties/Property.java
 */
export const PROPERTY: HashStrategy<IProperty<unknown>> = {
  hash: (property) => JavaString.hashCode(property.getId()),
  equals: (a, b) => a.getId() === b.getId(),
};

/** Type guard for the Java `instanceof IPropertyValueProxy` test: an object with a `resolveValue` function. */
function isPropertyValueProxy(o: unknown): o is IPropertyValueProxy {
  return typeof o === 'object' && o !== null && 'resolveValue' in o && typeof o.resolveValue === 'function';
}

type PropertyHashMap = JavaHashMap<IProperty<unknown>, unknown>;

/**
 * The `PropertyMap` view of the `HashMap` that Java's `getAllProperties()` returns directly
 * (`JavaHashMap` exposes `size` as a getter and `entries()`, so it does not match structurally).
 */
class HashPropertyMap implements PropertyMap {
  constructor(private readonly map: PropertyHashMap) {}

  get(property: IProperty<unknown>): unknown {
    return this.map.get(property);
  }

  containsKey(property: IProperty<unknown>): boolean {
    return this.map.containsKey(property);
  }

  isEmpty(): boolean {
    return this.map.isEmpty();
  }

  size(): number {
    return this.map.size;
  }

  [Symbol.iterator](): Iterator<[IProperty<unknown>, unknown]> {
    return this.map.entries();
  }
}

/** The stand-in for `Collections.emptyMap()`. */
const EMPTY_MAP: PropertyMap = new HashPropertyMap(new JavaHashMap<IProperty<unknown>, unknown>(PROPERTY));

/**
 * An implementation of {@link IPropertyHolder} based on a {@link JavaHashMap} (Java `HashMap`).
 * `Serializable` is dropped (no Java serialization in the port).
 *
 * @author msp
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/properties/MapPropertyHolder.java
 */
export class MapPropertyHolder implements IPropertyHolder {
  /** map of property identifiers to their values. */
  private propertyMap: PropertyHashMap | null = null;

  setProperty<T>(property: IProperty<T>, value: T | null): MapPropertyHolder {
    if (value === null) {
      this.getProperties().remove(property);
    } else {
      this.getProperties().put(property, value);
    }

    return this;
  }

  getProperty<T>(property: IProperty<T>): T {
    let value = this.getProperties().get(property);
    if (isPropertyValueProxy(value)) {
      value = value.resolveValue(property);
      if (value !== null) {
        this.getProperties().put(property, value);
        // unchecked cast, as in Java: the stored value is trusted to match the property type
        return value as T;
      }
    } else if (value !== undefined && value !== null) {
      return value as T;
    }

    // the reason for the side effect below is that if a default value has been returned
    // and the object is altered by the user, the user expects the altered object to be
    // the value of the property in case he asks for the property again

    // Retrieve the default value and memorize it for our property
    const defaultValue = property.getDefault();
    if (ElkReflect.isCloneable(defaultValue)) {
      // We are now dealing with a clone of the default value which me may safely store away
      // for further modification
      this.setProperty(property, defaultValue);
    }
    return defaultValue;
  }

  hasProperty(property: IProperty<unknown>): boolean {
    return this.propertyMap !== null && this.propertyMap.containsKey(property);
  }

  copyProperties(other: IPropertyHolder | null): MapPropertyHolder {
    if (other === null) {
      return this;
    }

    const otherMap = other.getAllProperties();
    if (!otherMap.isEmpty()) {
      if (this.propertyMap === null) {
        this.propertyMap = JavaHashMap.copyOf(PROPERTY, otherMap);
      } else {
        this.propertyMap.putAll(otherMap);
      }
    }

    return this;
  }

  getAllProperties(): PropertyMap {
    if (this.propertyMap === null) {
      return EMPTY_MAP;
    } else {
      return new HashPropertyMap(this.propertyMap);
    }
  }

  /**
   * Returns the property map, creating a new map if there hasn't been one so far.
   *
   * @return the property map.
   */
  private getProperties(): PropertyHashMap {
    if (this.propertyMap === null) {
      this.propertyMap = new JavaHashMap<IProperty<unknown>, unknown>(PROPERTY);
    }
    return this.propertyMap;
  }
}
