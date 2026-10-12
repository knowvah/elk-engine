// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { SizeConstraint } from '../../core/options/SizeConstraint.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { ElkReflect } from '../util/ElkReflect.js';
import type { IProperty } from './IProperty.js';
import type { IPropertyValueProxy } from './IPropertyValueProxy.js';
import { MapPropertyHolder, PROPERTY } from './MapPropertyHolder.js';
import { Property } from './Property.js';

/** A proxy that resolves to a fixed value (or `null`) and counts its resolutions. */
class FixedProxy implements IPropertyValueProxy {
  resolutions = 0;
  constructor(private readonly resolved: unknown) {}
  resolveValue<T>(_property: IProperty<T>): T | null {
    this.resolutions++;
    return this.resolved as T | null;
  }
}

describe('MapPropertyHolder', () => {
  beforeAll(() => {
    ElkReflect.register(
      Array,
      () => [],
      (a) => [...(a as unknown[])],
    );
  });

  describe('PROPERTY hash strategy', () => {
    it('hashes by the id and equals by the id', () => {
      expect(PROPERTY.hash(new Property<number>('abc'))).toBe(96354);
      expect(PROPERTY.equals(new Property<number>('k'), new Property<string>('k'))).toBe(true);
      expect(PROPERTY.equals(new Property<number>('k'), new Property<number>('j'))).toBe(false);
    });
  });

  describe('setProperty / getProperty', () => {
    it('returns a set value and the holder itself', () => {
      const p = new Property<number>('p', 1);
      const holder = new MapPropertyHolder();
      expect(holder.setProperty(p, 7)).toBe(holder);
      expect(holder.getProperty(p)).toBe(7);
      expect(holder.hasProperty(p)).toBe(true);
    });

    it('removes the property when set to null', () => {
      const p = new Property<number>('p', 1);
      const holder = new MapPropertyHolder().setProperty(p, 7);
      holder.setProperty(p, null);
      expect(holder.hasProperty(p)).toBe(false);
      expect(holder.getProperty(p)).toBe(1);
    });

    it('removing from a holder that never had a map is a no-op', () => {
      const p = new Property<number>('p', 1);
      const holder = new MapPropertyHolder().setProperty(p, null);
      expect(holder.hasProperty(p)).toBe(false);
      expect(holder.getAllProperties().size()).toBe(0);
    });

    it('returns a non-cloneable default without storing it', () => {
      const p = new Property<number>('p', 1);
      const holder = new MapPropertyHolder();
      expect(holder.getProperty(p)).toBe(1);
      expect(holder.hasProperty(p)).toBe(false);
    });

    it('returns null for a property without default and stores nothing', () => {
      const p = new Property<number>('p');
      const holder = new MapPropertyHolder();
      expect(holder.getProperty(p)).toBeNull();
      expect(holder.hasProperty(p)).toBe(false);
    });

    it('stores the cloned default of a cloneable property so later edits stick', () => {
      const original = EnumSet.allOf(SizeConstraint);
      const p = new Property<EnumSet<SizeConstraint>>('sizes', original);
      const holder = new MapPropertyHolder();
      const first = holder.getProperty(p);
      expect(first).not.toBe(original);
      expect(holder.hasProperty(p)).toBe(true);
      first.remove(SizeConstraint.PORTS);
      const again = holder.getProperty(p);
      expect(again).toBe(first);
      expect(again.contains(SizeConstraint.PORTS)).toBe(false);
      expect(original.contains(SizeConstraint.PORTS)).toBe(true);
    });

    it('stores a cloned array default', () => {
      const p = new Property<number[]>('list', [1, 2]);
      const holder = new MapPropertyHolder();
      const list = holder.getProperty(p);
      list.push(3);
      expect(holder.getProperty(p)).toEqual([1, 2, 3]);
      expect(p.getDefault()).toEqual([1, 2]);
    });
  });

  describe('property identity by id', () => {
    it('treats two Property instances with the same id as one key', () => {
      const a = new Property<number>('same.id', 0);
      const b = new Property<number>('same.id', 0);
      const holder = new MapPropertyHolder();
      holder.setProperty(a, 1);
      holder.setProperty(b, 2);
      expect(holder.hasProperty(a)).toBe(true);
      expect(holder.hasProperty(b)).toBe(true);
      expect(holder.getAllProperties().size()).toBe(1);
      expect(holder.getProperty(a)).toBe(2);
    });
  });

  describe('property value proxies', () => {
    it('replaces a resolving proxy by its value and returns it', () => {
      const p = new Property<number>('p', 1);
      const proxy = new FixedProxy(42);
      const holder = new MapPropertyHolder();
      holder.setProperty(p, proxy as unknown as number);
      expect(holder.getProperty(p)).toBe(42);
      expect(holder.getAllProperties().get(p)).toBe(42);
      expect(holder.getProperty(p)).toBe(42);
      expect(proxy.resolutions).toBe(1);
    });

    it('returns the default when the proxy resolves to null and keeps the proxy', () => {
      const p = new Property<number>('p', 1);
      const proxy = new FixedProxy(null);
      const holder = new MapPropertyHolder();
      holder.setProperty(p, proxy as unknown as number);
      expect(holder.getProperty(p)).toBe(1);
      expect(holder.getAllProperties().get(p)).toBe(proxy);
      expect(holder.getProperty(p)).toBe(1);
      expect(proxy.resolutions).toBe(2);
    });
  });

  describe('hasProperty', () => {
    it('is false for a holder without any properties', () => {
      expect(new MapPropertyHolder().hasProperty(new Property<number>('p'))).toBe(false);
    });

    it('is false for an unset property of a holder with other properties', () => {
      const holder = new MapPropertyHolder().setProperty(new Property<number>('a'), 1);
      expect(holder.hasProperty(new Property<number>('b'))).toBe(false);
    });
  });

  describe('copyProperties', () => {
    it('does nothing for null and returns the holder', () => {
      const holder = new MapPropertyHolder().setProperty(new Property<number>('a'), 1);
      expect(holder.copyProperties(null)).toBe(holder);
      expect(holder.getAllProperties().size()).toBe(1);
    });

    it('copies nothing from a holder without properties', () => {
      const holder = new MapPropertyHolder();
      expect(holder.copyProperties(new MapPropertyHolder())).toBe(holder);
      expect(holder.getAllProperties().isEmpty()).toBe(true);
    });

    it('creates the map from the other holder when it has none', () => {
      const a = new Property<number>('a');
      const b = new Property<string>('b');
      const source = new MapPropertyHolder().setProperty(a, 1).setProperty(b, 'x');
      const target = new MapPropertyHolder().copyProperties(source);
      expect(target.getProperty(a)).toBe(1);
      expect(target.getProperty(b)).toBe('x');
      target.setProperty(a, 5);
      expect(source.getProperty(a)).toBe(1);
    });

    it('merges into an existing map, the other holder winning', () => {
      const a = new Property<number>('a');
      const b = new Property<number>('b');
      const c = new Property<number>('c');
      const target = new MapPropertyHolder().setProperty(a, 1).setProperty(b, 2);
      const source = new MapPropertyHolder().setProperty(b, 20).setProperty(c, 30);
      target.copyProperties(source);
      expect(target.getProperty(a)).toBe(1);
      expect(target.getProperty(b)).toBe(20);
      expect(target.getProperty(c)).toBe(30);
      expect(target.getAllProperties().size()).toBe(3);
    });
  });

  describe('getAllProperties', () => {
    it('is empty for a fresh holder', () => {
      const all = new MapPropertyHolder().getAllProperties();
      expect(all.isEmpty()).toBe(true);
      expect(all.size()).toBe(0);
      expect(all.get(new Property<number>('a'))).toBeUndefined();
      expect(all.containsKey(new Property<number>('a'))).toBe(false);
      expect([...all]).toEqual([]);
    });

    it('exposes the assigned properties in HashMap iteration order', () => {
      const a = new Property<number>('a');
      const b = new Property<number>('b');
      const holder = new MapPropertyHolder().setProperty(b, 2).setProperty(a, 1);
      const all = holder.getAllProperties();
      expect(all.isEmpty()).toBe(false);
      expect(all.size()).toBe(2);
      expect(all.containsKey(a)).toBe(true);
      expect(all.get(b)).toBe(2);
      expect([...all].map(([k, v]) => [k.getId(), v])).toEqual([
        ['a', 1],
        ['b', 2],
      ]);
    });

    it('is a live view of the holder', () => {
      const a = new Property<number>('a');
      const holder = new MapPropertyHolder().setProperty(a, 1);
      const all = holder.getAllProperties();
      holder.setProperty(a, 9);
      expect(all.get(a)).toBe(9);
    });
  });
});
