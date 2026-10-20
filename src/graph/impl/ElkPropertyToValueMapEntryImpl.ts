// SPDX-License-Identifier: EPL-2.0
import type { EList } from '../../emf/common/util/EList.js';
import type { EClass } from '../../emf/ecore/EClass.js';
import type { InternalEObject } from '../../emf/ecore/InternalEObject.js';
import { BasicEObjectImpl } from '../../emf/ecore/impl/BasicEObjectImpl.js';
import type { BasicEMapEntry, EcoreEMap } from '../../emf/ecore/util/EcoreEMap.js';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import type { EMapPropertyHolder } from '../EMapPropertyHolder.js';
import { ElkGraphPackage } from '../ElkGraphPackage.js';
import type { IProperty } from '../properties/IProperty.js';
import { PROPERTY } from '../properties/MapPropertyHolder.js';

/** No contents: the entry has no containment feature. */
const NO_CONTAINMENTS: ReadonlyArray<EList<InternalEObject>> = [];

/** Java `String.valueOf(Object)`: `"null"` for null, else the object's `toString()`. */
function stringValueOf(o: unknown): string {
  return o === null ? 'null' : String(o);
}

/**
 * An implementation of the model object '<em><b>Elk Property To Value Map Entry</b></em>'.
 * Not ported (D4): `eGet`, `eSet`, `eUnset`, `eIsSet`, notifications.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java
 */
export class ElkPropertyToValueMapEntryImpl
  extends BasicEObjectImpl
  implements BasicEMapEntry<IProperty<unknown>, unknown>
{
  /**
   * The cached value of the '{@link getTypedKey() <em>Key</em>}' attribute.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java
   */
  protected key: IProperty<unknown> | null = null;

  /**
   * The default value of the '{@link getTypedValue() <em>Value</em>}' attribute.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java
   */
  protected static readonly VALUE_EDEFAULT: unknown = null;

  /**
   * The cached value of the '{@link getTypedValue() <em>Value</em>}' attribute.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java
   */
  protected value: unknown = ElkPropertyToValueMapEntryImpl.VALUE_EDEFAULT;

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java */
  protected eStaticClass(): EClass {
    return ElkGraphPackage.Literals.ELK_PROPERTY_TO_VALUE_MAP_ENTRY;
  }

  /**
   * `MinimalEObjectImpl.eClass()`: the static class.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java
   */
  eClass(): EClass {
    return this.eStaticClass();
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java */
  getTypedKey(): IProperty<unknown> | null {
    return this.key;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java */
  setTypedKey(newKey: IProperty<unknown> | null): void {
    this.key = newKey;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java */
  getTypedValue(): unknown {
    return this.value;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java */
  setTypedValue(newValue: unknown): void {
    this.value = newValue;
  }

  // eGet, eSet, eUnset, eIsSet: not ported (D4)

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java */
  override toString(): string {
    if (this.eIsProxy()) return super.toString();
    return `${this.key !== null ? this.key.getId() : 'null'} -> ${stringValueOf(this.value)}`;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java */
  protected hash = -1;

  /**
   * The key's `hashCode()`, which for `IProperty` is the id's `String.hashCode` (D5).
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java
   */
  getHash(): number {
    if (this.hash === -1) {
      const theKey: IProperty<unknown> | null = this.getKey();
      this.hash = theKey === null ? 0 : PROPERTY.hash(theKey);
    }
    return this.hash;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java */
  setHash(hash: number): void {
    this.hash = hash;
  }

  /**
   * Java returns the typed key, `null` until set. Every entry of a property map gets its key in
   * `newEntry` before it is added; the `BasicEMapEntry` contract types the key as non-null, so a
   * fresh entry's `null` is passed through unchecked, as in Java.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java
   */
  getKey(): IProperty<unknown> {
    return this.getTypedKey() as IProperty<unknown>;
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java */
  setKey(key: IProperty<unknown>): void {
    this.setTypedKey(key);
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java */
  getValue(): unknown {
    return this.getTypedValue();
  }

  /** @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java */
  setValue(value: unknown): unknown {
    const oldValue = this.getValue();
    this.setTypedValue(value);
    return oldValue;
  }

  /**
   * Java reads the container's feature through `eGet(eContainmentFeature())` (not ported, D4); the
   * only feature typed `ElkPropertyToValueMapEntry` is `EMapPropertyHolder.properties`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java
   */
  getEMap(): EcoreEMap<IProperty<unknown>, unknown> | null {
    const container = this.eContainer();
    return container === null ? null : (container as EMapPropertyHolder).getProperties();
  }

  /**
   * Java inherits the metamodel-driven base (not ported, D3/D4); an entry's container feature id is
   * always negative (opposite-less containment), so this is never reached from
   * `eBasicRemoveFromContainer`.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java
   */
  eBasicRemoveFromContainerFeature(): void {
    throw new UnsupportedOperationException(
      `eBasicRemoveFromContainerFeature: no generated case for feature ${this.eContainerFeatureID()}`,
    );
  }

  /**
   * The entry has no containment feature.
   *
   * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/impl/ElkPropertyToValueMapEntryImpl.java
   */
  protected eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>> {
    return NO_CONTAINMENTS;
  }
}
