// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../emf/common/util/EList.js';
import type { EClass } from '../../emf/ecore/EClass.js';
import type { InternalEObject } from '../../emf/ecore/InternalEObject.js';
import { BasicEObjectImpl } from '../../emf/ecore/impl/BasicEObjectImpl.js';
import { EcoreEMap } from '../../emf/ecore/util/EcoreEMap.js';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import { type EMapPropertyHolder, isEMapPropertyHolder } from '../EMapPropertyHolder.js';
import { ElkGraphPackage, registerImpl } from '../ElkGraphPackage.js';
import type { IProperty } from '../properties/IProperty.js';
import type { IPropertyHolder } from '../properties/IPropertyHolder.js';
import { isPropertyValueProxy } from '../properties/IPropertyValueProxy.js';
import { PROPERTY } from '../properties/MapPropertyHolder.js';
import type { PropertyMap } from '../properties/PropertyMap.js';
import { ElkReflect } from '../util/ElkReflect.js';
import { ElkPropertyToValueMapEntryImpl } from './ElkPropertyToValueMapEntryImpl.js';

/** The property map type: `IProperty` keys (equal by id, D5) to values, held in contained entries. */
type PropertiesEMap = EcoreEMap<IProperty<unknown>, unknown, ElkPropertyToValueMapEntryImpl>;

/**
 * EMF's `EcoreEMap.newEntry(hash, key, value)`: the package factory creates the entry
 * (`ElkGraphFactoryImpl.createElkPropertyToValueMapEntry()` is `new ElkPropertyToValueMapEntryImpl()`),
 * then hash, key and value are set in that order. The hash is `BasicEMap.hashOf(key)`, the key's
 * `hashCode()` (by id, D5).
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkGraphFactoryImpl.java
 */
function newPropertyEntry(key: IProperty<unknown>, value: unknown): ElkPropertyToValueMapEntryImpl {
  const entry = new ElkPropertyToValueMapEntryImpl();
  entry.setHash(PROPERTY.hash(key));
  entry.setKey(key);
  entry.setValue(value);
  return entry;
}

/**
 * An implementation of the model object '<em><b>EMap Property Holder</b></em>'. Java extends
 * `MinimalEObjectImpl.Container`, whose container storage `BasicEObjectImpl` carries here.
 * Not ported (D4): `eGet`, `eSet`, `eUnset`, `eIsSet`, notifications.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/EMapPropertyHolderImpl.java
 */
export abstract class EMapPropertyHolderImpl extends BasicEObjectImpl implements EMapPropertyHolder {
  /**
   * The cached value of the '{@link getProperties() <em>Properties</em>}' map.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/EMapPropertyHolderImpl.java
   */
  protected properties: PropertiesEMap | null = null;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/EMapPropertyHolderImpl.java */
  protected eStaticClass(): EClass {
    return ElkGraphPackage.Literals.EMAP_PROPERTY_HOLDER;
  }

  /**
   * `MinimalEObjectImpl.eClass()`: the static class (no dynamic `EClass` in the port).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/EMapPropertyHolderImpl.java
   */
  eClass(): EClass {
    return this.eStaticClass();
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/EMapPropertyHolderImpl.java */
  getProperties(): PropertiesEMap {
    if (this.properties === null) {
      this.properties = new EcoreEMap<IProperty<unknown>, unknown, ElkPropertyToValueMapEntryImpl>(
        PROPERTY,
        this,
        ElkGraphPackage.EMAP_PROPERTY_HOLDER__PROPERTIES,
        newPropertyEntry,
      );
    }
    return this.properties;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/EMapPropertyHolderImpl.java */
  setProperty<T>(property: IProperty<T>, value: T | null): IPropertyHolder {
    if (value === null) {
      this.getProperties().removeKey(property);
    } else {
      this.getProperties().put(property, value);
    }
    return this;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/EMapPropertyHolderImpl.java */
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
    const defaultValue = property.getDefault();
    if (ElkReflect.isCloneable(defaultValue)) {
      // We are now dealing with a clone of the default value which me may safely store away
      // for further modification
      this.setProperty(property, defaultValue);
    }
    return defaultValue;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/EMapPropertyHolderImpl.java */
  hasProperty(property: IProperty<unknown>): boolean {
    return this.getProperties().containsKey(property);
  }

  /**
   * Java iterates the other holder's `EMap`, whose iterator yields the entry objects themselves, so
   * `entry.setValue` writes back into the source; the port iterates the entry list for the same
   * objects. `EcoreEMap` has no `putAll`; the `else` branch inlines `BasicEMap.putAll(Map)`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/EMapPropertyHolderImpl.java
   */
  copyProperties(source: IPropertyHolder | null): IPropertyHolder {
    if (source === null) {
      return this;
    }
    if (isEMapPropertyHolder(source)) {
      const other = source;
      const ourProps = this.getProperties();
      for (const entry of other.getProperties().entryList()) {
        let value = entry.getValue();
        if (isPropertyValueProxy(value)) {
          const proxy = value;
          const newValue = proxy.resolveValue(entry.getKey());
          if (newValue !== null) {
            entry.setValue(newValue);
            value = newValue;
          }
        }
        ourProps.put(entry.getKey(), value);
      }
    } else {
      for (const [key, value] of source.getAllProperties()) {
        this.getProperties().put(key, value);
      }
    }
    return this;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/EMapPropertyHolderImpl.java */
  getAllProperties(): PropertyMap {
    const props = this.getProperties();
    // check for unresolved properties
    for (const entry of props.entryList()) {
      const entryValue = entry.getValue();
      // a key is null only after `entry.setTypedKey(null)`, as in Java
      if (isPropertyValueProxy(entryValue) && entry.getKey() !== null) {
        const proxy = entryValue;
        // Try to resolve the proxy's value, maybe the layout option was
        // registered by now. If not, we preserve the proxy.
        const value = proxy.resolveValue(entry.getKey());
        if (value !== null) {
          entry.setValue(value);
        }
      }
    }
    return props.map();
  }

  /**
   * `InternalEList.basicRemove(otherEnd)` takes any object in Java; the entry list is typed, and
   * only an entry is ever passed for this feature.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/EMapPropertyHolderImpl.java
   */
  override eInverseRemove(otherEnd: InternalEObject, featureID: number): void {
    switch (featureID) {
      case ElkGraphPackage.EMAP_PROPERTY_HOLDER__PROPERTIES:
        this.getProperties()
          .entryList()
          .basicRemove(otherEnd as ElkPropertyToValueMapEntryImpl);
        return;
    }
    super.eInverseRemove(otherEnd, featureID);
  }

  // eGet, eSet, eUnset, eIsSet: not ported (D4)

  /**
   * Stands in for `BasicEObjectImpl.eBasicRemoveFromContainerFeature`, which looks up the
   * opposite in the metamodel (not ported, D3/D4). Subclasses override with their generated
   * `switch`; reaching this base means a container feature id with no generated case.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/EMapPropertyHolderImpl.java
   */
  eBasicRemoveFromContainerFeature(): void {
    throw new UnsupportedOperationException(
      `eBasicRemoveFromContainerFeature: no generated case for feature ${this.eContainerFeatureID()}`,
    );
  }

  /**
   * The containment features of `elkgraph.ecore` in declaration order: `properties` (D4).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/EMapPropertyHolderImpl.java
   */
  protected eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return [this.getProperties().entryList()];
  }
}

registerImpl('EMapPropertyHolder', EMapPropertyHolderImpl);
