// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import { isEMapPropertyHolder } from '../EMapPropertyHolder.js';
import { ElkGraphPackage } from '../ElkGraphPackage.js';
import type { IProperty } from '../properties/IProperty.js';
import type { IPropertyHolder } from '../properties/IPropertyHolder.js';
import type { IPropertyValueProxy } from '../properties/IPropertyValueProxy.js';
import { MapPropertyHolder } from '../properties/MapPropertyHolder.js';
import { Property } from '../properties/Property.js';
import { ElkReflect } from '../util/ElkReflect.js';
import { EMapPropertyHolderImpl } from './EMapPropertyHolderImpl.js';
import { ElkPropertyToValueMapEntryImpl } from './ElkPropertyToValueMapEntryImpl.js';

/** The abstract class under test, made concrete. */
class TestHolder extends EMapPropertyHolderImpl {}

const A = new Property<string>('test.a');
const B = new Property<string>('test.b');
const C = new Property<number>('test.c', 7);

/** A proxy resolving to `resolved` (or `null`), counting its calls. */
function proxy(resolved: unknown): IPropertyValueProxy & { calls: number } {
  const p = {
    calls: 0,
    resolveValue<T>(_property: IProperty<T>): T | null {
      p.calls++;
      return resolved as T | null;
    },
  };
  return p;
}

/** The property ids of `holder.getAllProperties()` in iteration order. */
/**
 * The ids in entry-list order (D2: put on an existing key keeps its place, removeKey then put
 * appends). `getAllProperties()` iterates EMF's hash buckets instead (`BasicEMap.entrySet`), so
 * list order is read from the entry list itself.
 */
function keys(holder: EMapPropertyHolderImpl): string[] {
  return [...holder.getProperties().entryList()].map((entry) => entry.getKey().getId());
}

/** The ids in `getAllProperties()` order: EMF hash-bucket order (`BasicEMap.entrySet`). */
function mapKeys(holder: IPropertyHolder): string[] {
  return [...holder.getAllProperties()].map(([key]) => key.getId());
}

/** A value class Java would call `Cloneable`, registered with `ElkReflect` the way ELK does. */
class Box {
  constructor(readonly content: string) {}
  clone(): Box {
    return new Box(this.content);
  }
}
ElkReflect.registerClone(Box, (o) => (o as Box).clone());

describe('EMapPropertyHolderImpl', () => {
  it('is an EMapPropertyHolder by the guard', () => {
    expect(isEMapPropertyHolder(new TestHolder())).toBe(true);
    expect(isEMapPropertyHolder({})).toBe(false);
  });

  it('reports the EMapPropertyHolder EClass', () => {
    expect(new TestHolder().eClass().getName()).toBe('EMapPropertyHolder');
  });

  it('creates the properties map once, owned by the holder under the properties feature', () => {
    const holder = new TestHolder();
    const props = holder.getProperties();
    expect(holder.getProperties()).toBe(props);
    props.put(A, 'x');
    const entry = props.entryList().get(0);
    expect(entry).toBeInstanceOf(ElkPropertyToValueMapEntryImpl);
    expect(entry.eContainer()).toBe(holder);
    expect(entry.eContainerFeatureID()).toBe(-1 - ElkGraphPackage.EMAP_PROPERTY_HOLDER__PROPERTIES);
    expect(entry.getHash()).toBe(A.hashCode());
  });

  it('setProperty stores, returns the holder, and removes on null', () => {
    const holder = new TestHolder();
    expect(holder.setProperty(A, 'x')).toBe(holder);
    expect(holder.hasProperty(A)).toBe(true);
    expect(holder.getProperty(A)).toBe('x');
    const entry = holder.getProperties().entryList().get(0);
    holder.setProperty(A, null);
    expect(holder.hasProperty(A)).toBe(false);
    expect(holder.getProperties().size()).toBe(0);
    expect(entry.eContainer()).toBeNull();
  });

  it('keeps the position of an existing key and appends after a removal', () => {
    const holder = new TestHolder();
    holder.setProperty(A, '1');
    holder.setProperty(B, '2');
    holder.setProperty(A, '3');
    expect(keys(holder)).toEqual(['test.a', 'test.b']);
    expect(holder.getProperty(A)).toBe('3');
    holder.setProperty(A, null);
    holder.setProperty(A, '4');
    expect(keys(holder)).toEqual(['test.b', 'test.a']);
    // map() order: String.hashCode("test.a") = -877171195, "test.b" = -877171194; capacity 6 after
    // the second put (1 -> 2*1+4), buckets (h & 0x7fffffff) % 6 = 1 and 2, so a precedes b.
    expect(mapKeys(holder)).toEqual(['test.a', 'test.b']);
  });

  it('getProperty returns the default without storing a non-cloneable one', () => {
    const holder = new TestHolder();
    expect(holder.getProperty(C)).toBe(7);
    expect(holder.hasProperty(C)).toBe(false);
    expect(holder.getProperty(A)).toBeNull();
    expect(holder.hasProperty(A)).toBe(false);
  });

  it('getProperty stores a cloned cloneable default on first access', () => {
    const original = new Box('d');
    const boxProperty = new Property<Box>('test.box', original);
    const holder = new TestHolder();
    const first = holder.getProperty(boxProperty);
    expect(first).not.toBe(original);
    expect(first.content).toBe('d');
    expect(holder.hasProperty(boxProperty)).toBe(true);
    expect(holder.getProperty(boxProperty)).toBe(first);
  });

  it('getProperty resolves a proxy value and stores the result in place', () => {
    const holder = new TestHolder();
    holder.setProperty(A, 'first');
    const p = proxy('resolved');
    holder.getProperties().put(B, p);
    holder.setProperty(C, 1);
    expect(holder.getProperty(B)).toBe('resolved');
    expect(holder.getProperties().get(B)).toBe('resolved');
    expect(keys(holder)).toEqual(['test.a', 'test.b', 'test.c']);
    expect(p.calls).toBe(1);
  });

  it('getProperty falls back to the default when the proxy does not resolve', () => {
    const holder = new TestHolder();
    const p = proxy(null);
    holder.getProperties().put(C, p);
    expect(holder.getProperty(C)).toBe(7);
    expect(holder.getProperties().get(C)).toBe(p);
  });

  it('getAllProperties resolves proxies it can and keeps the others', () => {
    const holder = new TestHolder();
    const unresolved = proxy(null);
    holder.getProperties().put(A, proxy('ok'));
    holder.getProperties().put(B, unresolved);
    holder.setProperty(C, 3);
    const all = holder.getAllProperties();
    expect([...all]).toEqual([
      [A, 'ok'],
      [B, unresolved],
      [C, 3],
    ]);
    expect(all.size()).toBe(3);
    expect(all.get(A)).toBe('ok');
    expect(all.containsKey(B)).toBe(true);
    expect(all.isEmpty()).toBe(false);
  });

  it('getAllProperties skips an entry whose key was cleared', () => {
    const holder = new TestHolder();
    const p = proxy('never');
    holder.getProperties().put(A, p);
    const entry = holder.getProperties().entryList().get(0) as ElkPropertyToValueMapEntryImpl;
    entry.setTypedKey(null);
    holder.getAllProperties();
    expect(p.calls).toBe(0);
    expect(entry.getValue()).toBe(p);
  });

  it('copyProperties(null) returns the holder unchanged', () => {
    const holder = new TestHolder();
    expect(holder.copyProperties(null)).toBe(holder);
    expect(holder.getProperties().size()).toBe(0);
  });

  it('copyProperties from another EMap holder resolves proxies on both sides and keeps order', () => {
    const source = new TestHolder();
    const unresolved = proxy(null);
    source.setProperty(B, 'b');
    source.getProperties().put(A, proxy('a'));
    source.getProperties().put(C, unresolved);
    const target = new TestHolder();
    target.setProperty(A, 'old');
    expect(target.copyProperties(source)).toBe(target);
    expect([...target.getAllProperties()]).toEqual([
      [A, 'a'],
      [B, 'b'],
      [C, unresolved],
    ]);
    expect(source.getProperties().get(A)).toBe('a');
    expect(source.getProperties().get(C)).toBe(unresolved);
  });

  it('copyProperties from a plain holder puts every property', () => {
    const source = new MapPropertyHolder();
    source.setProperty(A, 'a');
    source.setProperty(C, 5);
    const target = new TestHolder();
    target.setProperty(C, 1);
    target.copyProperties(source);
    expect(target.getProperty(A)).toBe('a');
    expect(target.getProperty(C)).toBe(5);
    expect(target.getProperties().size()).toBe(2);
  });

  it('lists the property entries as its contents', () => {
    const holder = new TestHolder();
    holder.setProperty(A, 'a');
    holder.setProperty(B, 'b');
    const entries = holder.getProperties().entryList().toArray();
    expect(holder.eContents().toArray()).toEqual(entries);
    expect([...holder.eAllContents()]).toEqual(entries);
  });

  it('eInverseRemove on the properties feature drops the entry without releasing it', () => {
    const holder = new TestHolder();
    holder.setProperty(A, 'a');
    const entry = holder.getProperties().entryList().get(0);
    holder.eInverseRemove(entry, ElkGraphPackage.EMAP_PROPERTY_HOLDER__PROPERTIES);
    expect(holder.getProperties().entryList().size()).toBe(0);
    expect(holder.hasProperty(A)).toBe(false);
    expect(entry.eContainer()).toBe(holder);
  });

  it('moves an entry to another holder through the entry list', () => {
    const from = new TestHolder();
    from.setProperty(A, 'a');
    const entry = from.getProperties().entryList().get(0);
    const to = new TestHolder();
    to.getProperties().entryList().add(entry);
    expect(entry.eContainer()).toBe(to);
    expect(from.hasProperty(A)).toBe(false);
    expect(to.getProperty(A)).toBe('a');
  });

  it('passes other inverse features to the base', () => {
    const holder = new TestHolder();
    const other = new TestHolder();
    expect(() => holder.eInverseRemove(other, 5)).toThrow(UnsupportedOperationException);
    holder.eInverseRemove(other, -3);
    expect(holder.eContainerFeatureID()).toBe(-3);
  });

  it('has no generated container feature to remove from', () => {
    expect(() => new TestHolder().eBasicRemoveFromContainerFeature()).toThrow(
      new UnsupportedOperationException('eBasicRemoveFromContainerFeature: no generated case for feature 0'),
    );
  });
});
